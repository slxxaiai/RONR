import { z } from "zod";
import type {
  AgentConfig,
  CreateSessionRequest,
  DeliberationSessionSnapshot,
  Locale,
  Mandate,
  ProviderCallMeta
} from "@ronr/contracts";
import type { ModelProvider, ModelProviderResponse } from "@ronr/providers";
import { ProviderRuntimeError } from "@ronr/providers";

const chairOutputSchema = z.object({
  goal: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  mainMotion: z.object({
    title: z.string().min(1),
    description: z.string().min(1)
  }),
  nextTask: z.string().min(1)
});

const memberOutputSchema = z.object({
  speech: z.string().min(1),
  claims: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  objection: z.object({
    type: z.enum(["risk", "counterexample", "cost", "constraint_conflict", "alternative"]),
    description: z.string().min(1),
    severity: z.enum(["low", "medium", "high", "blocking"]),
    condition: z.string().min(1)
  }),
  vote: z.object({
    position: z.enum(["support", "oppose", "abstain", "qualified_support"]),
    reason: z.string().min(1),
    conditions: z.array(z.string()).default([])
  }),
  reservation: z.string().optional().default("")
});

const secretaryOutputSchema = z.object({
  summary: z.string().min(1),
  actionItems: z.array(z.object({
    title: z.string().min(1),
    rationale: z.string().min(1),
    conditions: z.array(z.string()).default([]),
    firstValidation: z.string().min(1),
    sourceRefs: z.array(z.string()).default([])
  })).min(1)
});

export async function runDeliberation(
  request: CreateSessionRequest,
  provider: ModelProvider
): Promise<{ snapshot: DeliberationSessionSnapshot; providerMeta: ProviderCallMeta[] }> {
  const sessionId = `session-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const providerMeta: ProviderCallMeta[] = [];

  const chairResponse = await callAgent(provider, {
    role: "chair",
    agentId: "chair",
    model: request.agentConfig.chair.model,
    prompt: buildChairPrompt(request.userQuestion, request.locale)
  });
  providerMeta.push(toMeta(chairResponse, "chair", "chair"));
  const chair = parseAgentJson(chairResponse.contentText, chairOutputSchema);

  const motionId = "motion-main";
  const memberOutputs = [];
  for (const member of request.agentConfig.members) {
    const response = await callAgent(provider, {
      role: "member",
      agentId: member.id,
      model: member.model,
      prompt: buildMemberPrompt(request.userQuestion, request.locale, member.mandate, chair.mainMotion.description)
    });
    providerMeta.push(toMeta(response, "member", member.id));
    memberOutputs.push({
      member,
      output: parseAgentJson(response.contentText, memberOutputSchema)
    });
  }

  const secretaryResponse = await callAgent(provider, {
    role: "secretary",
    agentId: "secretary",
    model: request.agentConfig.secretary.model,
    prompt: buildSecretaryPrompt(request.userQuestion, request.locale, chair.goal, memberOutputs.map((entry) => entry.output.speech))
  });
  providerMeta.push(toMeta(secretaryResponse, "secretary", "secretary"));
  const secretary = parseAgentJson(secretaryResponse.contentText, secretaryOutputSchema);

  const speeches = [
    {
      id: "speech-chair",
      agentId: "chair",
      role: "chair" as const,
      phase: "call_to_order",
      content: chair.nextTask,
      claims: [chair.goal],
      assumptions: chair.constraints
    },
    ...memberOutputs.map(({ member, output }) => ({
      id: `speech-${member.id}`,
      agentId: member.id,
      role: "member" as const,
      mandate: member.mandate,
      phase: "opening_statements",
      content: output.speech,
      claims: output.claims,
      assumptions: output.assumptions
    })),
    {
      id: "speech-secretary",
      agentId: "secretary",
      role: "secretary" as const,
      phase: "action_resolution",
      content: secretary.summary,
      claims: secretary.actionItems.map((item) => item.title),
      assumptions: []
    }
  ];

  const votes = memberOutputs.map(({ member, output }) => ({
    id: `vote-${member.id}`,
    motionId,
    agentId: member.id,
    position: output.vote.position,
    reason: output.vote.reason,
    conditions: output.vote.conditions,
    sourceSpeechId: `speech-${member.id}`,
    reservationIds: output.reservation ? [`reservation-${member.id}`] : []
  }));

  const snapshot: DeliberationSessionSnapshot = {
    id: sessionId,
    userQuestion: request.userQuestion,
    goal: chair.goal,
    constraints: chair.constraints,
    locale: request.locale,
    status: "completed",
    phase: "action_resolution",
    agents: buildAgents(request.agentConfig),
    motions: [{
      id: motionId,
      title: chair.mainMotion.title,
      description: chair.mainMotion.description,
      status: "adopted"
    }],
    speeches,
    objections: memberOutputs.map(({ member, output }) => ({
      id: `objection-${member.id}`,
      motionId,
      raisedBy: member.id,
      type: output.objection.type,
      description: output.objection.description,
      severity: output.objection.severity,
      condition: output.objection.condition,
      sourceSpeechId: `speech-${member.id}`,
      resolutionStatus: "converted_to_condition"
    })),
    votes,
    reservations: memberOutputs
      .filter(({ output }) => output.reservation)
      .map(({ member, output }) => ({
        id: `reservation-${member.id}`,
        agentId: member.id,
        description: output.reservation,
        sourceVoteId: `vote-${member.id}`
      })),
    actionPlan: {
      summary: secretary.summary,
      items: secretary.actionItems.map((item, index) => ({
        id: `action-${index + 1}`,
        ...item
      }))
    },
    createdAt: now,
    updatedAt: now
  };

  return { snapshot, providerMeta };
}

function parseAgentJson<T extends z.ZodTypeAny>(text: string, schema: T): z.infer<T> {
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new ProviderRuntimeError(
      "schema_parse_failed",
      "Agent 输出无法解析为约定 JSON schema。"
    );
  }
}

async function callAgent(
  provider: ModelProvider,
  input: { role: "chair" | "secretary" | "member"; agentId: string; model: string; prompt: string }
): Promise<ModelProviderResponse> {
  return provider.complete({
    requestId: `${input.role}-${input.agentId}-${crypto.randomUUID()}`,
    providerProfileId: "ppio-default",
    model: input.model,
    messages: [
      {
        role: "system",
        content: "你是 RONR AI 议事系统中的结构化 Agent。只输出 JSON，不输出 Markdown。"
      },
      { role: "user", content: input.prompt }
    ]
  });
}

function toMeta(
  response: ModelProviderResponse,
  role: "chair" | "secretary" | "member",
  agentId: string
): ProviderCallMeta {
  return {
    requestId: response.requestId,
    role,
    agentId,
    model: response.model,
    latencyMs: response.providerMeta.latencyMs,
    httpStatus: response.providerMeta.httpStatus,
    finishReason: response.finishReason
  };
}

function buildAgents(agentConfig: AgentConfig): DeliberationSessionSnapshot["agents"] {
  return [
    { id: "chair", role: "chair", model: agentConfig.chair.model },
    { id: "secretary", role: "secretary", model: agentConfig.secretary.model },
    ...agentConfig.members.map((member) => ({
      id: member.id,
      role: "member" as const,
      mandate: member.mandate,
      model: member.model
    }))
  ];
}

function buildChairPrompt(userQuestion: string, locale: Locale): string {
  return [
    `Locale: ${locale}`,
    `User question: ${userQuestion}`,
    "请作为 Chair Agent 输出 JSON：",
    "{\"goal\":\"...\",\"constraints\":[\"...\"],\"mainMotion\":{\"title\":\"...\",\"description\":\"...\"},\"nextTask\":\"...\"}"
  ].join("\n");
}

function buildMemberPrompt(
  userQuestion: string,
  locale: Locale,
  mandate: Mandate,
  motionDescription: string
): string {
  return [
    `Locale: ${locale}`,
    `Mandate: ${mandate}`,
    `User question: ${userQuestion}`,
    `Motion: ${motionDescription}`,
    "请作为 Member Agent 输出 JSON：",
    "{\"speech\":\"...\",\"claims\":[\"...\"],\"assumptions\":[\"...\"],\"objection\":{\"type\":\"risk\",\"description\":\"...\",\"severity\":\"medium\",\"condition\":\"...\"},\"vote\":{\"position\":\"qualified_support\",\"reason\":\"...\",\"conditions\":[\"...\"]},\"reservation\":\"...\"}"
  ].join("\n");
}

function buildSecretaryPrompt(
  userQuestion: string,
  locale: Locale,
  goal: string,
  speeches: string[]
): string {
  return [
    `Locale: ${locale}`,
    `User question: ${userQuestion}`,
    `Goal: ${goal}`,
    `Speeches: ${speeches.join(" | ")}`,
    "请作为 Secretary Agent 输出 JSON：",
    "{\"summary\":\"...\",\"actionItems\":[{\"title\":\"...\",\"rationale\":\"...\",\"conditions\":[\"...\"],\"firstValidation\":\"...\",\"sourceRefs\":[\"speech-member-user\"]}]}"
  ].join("\n");
}
