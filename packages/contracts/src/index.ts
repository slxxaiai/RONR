import { z } from "zod";

export const localeSchema = z.enum(["zh-CN", "zh-TW", "en", "ja", "ko"]);
export type Locale = z.infer<typeof localeSchema>;

export const mandateSchema = z.enum([
  "general",
  "user-advocate",
  "domain-expert",
  "action-planner",
  "red-team"
]);
export type Mandate = z.infer<typeof mandateSchema>;

export const votePositionSchema = z.enum([
  "support",
  "oppose",
  "abstain",
  "qualified_support"
]);
export type VotePosition = z.infer<typeof votePositionSchema>;

export const objectionTypeSchema = z.enum([
  "risk",
  "counterexample",
  "cost",
  "constraint_conflict",
  "alternative"
]);
export type ObjectionType = z.infer<typeof objectionTypeSchema>;

export const objectionSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "blocking"
]);
export type ObjectionSeverity = z.infer<typeof objectionSeveritySchema>;

export const agentModelConfigSchema = z.object({
  model: z.string().min(1)
});
export type AgentModelConfig = z.infer<typeof agentModelConfigSchema>;

export const memberAgentConfigSchema = agentModelConfigSchema.extend({
  id: z.string().min(1),
  mandate: mandateSchema
});
export type MemberAgentConfig = z.infer<typeof memberAgentConfigSchema>;

export const agentConfigSchema = z.object({
  chair: agentModelConfigSchema,
  secretary: agentModelConfigSchema,
  members: z.array(memberAgentConfigSchema).min(2)
});
export type AgentConfig = z.infer<typeof agentConfigSchema>;

export const createSessionRequestSchema = z.object({
  userQuestion: z.string().trim().min(1),
  locale: localeSchema,
  agentConfig: agentConfigSchema,
  maxDeliberationRounds: z.number().int().positive().optional()
});
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export type ValidationResult =
  | { success: true; errors: [] }
  | { success: false; errors: string[] };

export function validateAgentConfig(
  agentConfig: unknown,
  availableModelIds: string[]
): ValidationResult {
  const errors: string[] = [];
  const available = new Set(availableModelIds);
  const value = agentConfig as {
    chair?: { model?: unknown };
    secretary?: { model?: unknown };
    members?: Array<{ model?: unknown; mandate?: unknown }>;
  } | undefined;

  const chairModel = typeof value?.chair?.model === "string" ? value.chair.model : "";
  const secretaryModel = typeof value?.secretary?.model === "string" ? value.secretary.model : "";
  if (!chairModel || !available.has(chairModel)) {
    errors.push("chair.model 必须选择支持的模型");
  }
  if (!secretaryModel || !available.has(secretaryModel)) {
    errors.push("secretary.model 必须选择支持的模型");
  }

  if (!Array.isArray(value?.members) || value.members.length < 2) {
    errors.push("members 至少需要两个 Member Agent");
  }
  value?.members?.forEach((member, index) => {
    const model = typeof member.model === "string" ? member.model : "";
    if (!model || !available.has(model)) {
      errors.push(`members[${index}].model 必须选择支持的模型`);
    }
    if (!mandateSchema.safeParse(member.mandate).success) {
      errors.push(`members[${index}].mandate 不受支持`);
    }
  });

  const uniqueErrors = [...new Set(errors)];
  return uniqueErrors.length > 0
    ? { success: false, errors: uniqueErrors }
    : { success: true, errors: [] };
}

export interface ProviderModel {
  id: string;
  title: string;
  description: string;
  contextSize: number;
  inputTokenPricePerM: number;
  outputTokenPricePerM: number;
}

export interface ProviderCallMeta {
  requestId: string;
  role: "chair" | "secretary" | "member";
  agentId: string;
  model: string;
  latencyMs: number;
  httpStatus?: number;
  finishReason?: string;
}

export interface Speech {
  id: string;
  agentId: string;
  role: "chair" | "secretary" | "member";
  mandate?: Mandate;
  phase: string;
  content: string;
  claims: string[];
  assumptions: string[];
}

export interface Objection {
  id: string;
  motionId: string;
  raisedBy: string;
  type: ObjectionType;
  description: string;
  severity: ObjectionSeverity;
  condition: string;
  sourceSpeechId: string;
  resolutionStatus: "converted_to_condition";
}

export interface Vote {
  id: string;
  motionId: string;
  agentId: string;
  position: VotePosition;
  reason: string;
  conditions: string[];
  sourceSpeechId: string;
  reservationIds: string[];
}

export interface Reservation {
  id: string;
  agentId: string;
  description: string;
  sourceVoteId: string;
}

export interface ActionItem {
  id: string;
  title: string;
  rationale: string;
  conditions: string[];
  firstValidation: string;
  sourceRefs: string[];
}

export interface DeliberationSessionSnapshot {
  id: string;
  userQuestion: string;
  goal: string;
  constraints: string[];
  locale: Locale;
  status: "completed";
  phase: "action_resolution";
  agents: Array<{
    id: string;
    role: "chair" | "secretary" | "member";
    mandate?: Mandate;
    model: string;
  }>;
  motions: Array<{
    id: string;
    title: string;
    description: string;
    status: "adopted";
  }>;
  speeches: Speech[];
  objections: Objection[];
  votes: Vote[];
  reservations: Reservation[];
  actionPlan: {
    summary: string;
    items: ActionItem[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: "completed";
  phase: "action_resolution";
  sessionSnapshot: DeliberationSessionSnapshot;
  providerMeta: ProviderCallMeta[];
}

export interface RonrErrorResponse {
  code: string;
  message: string;
  recoveryHint?: string;
}
