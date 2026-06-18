# Multilingual Glossary

本文档定义 RONR 的核心术语多语言对照。英文 `Canonical Term` 是代码、协议、API、数据结构和文档交叉引用的基准；其他语言用于 UI、本地化文案和面向用户的说明。

## Language Policy

- `Canonical Term` 保持英文，避免跨语言实现时概念漂移。
- 产品正文默认中文时，可以采用“中文译名 + 英文术语”的形式首次出现，例如“议事会话 Deliberation Session”。
- `Role`、`Mandate`、`Motion`、`Vote` 等协议字段在代码中不翻译。
- UI 文案可以使用本地化译名，但必须能映射回唯一 `Canonical Term`。
- 暂不翻译 `RONR` 和 `Robert's Rules of Order`。

## Core Product Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| RONR | RONR | RONR | RONR | RONR | Product name; abbreviation of Robert's Rules of Order. |
| Robert's Rules of Order | 罗伯特议事法则 | 羅伯特議事法則 | ロバート議事規則 | 로버트 의사규칙 | Do not abbreviate as RONR when explaining the source rule system. |
| AI Deliberation | AI 议事 | AI 議事 | AI 熟議 | AI 숙의 | Broad category for structured AI discussion. |
| Deliberation Session | 议事会话 | 議事會話 | 熟議セッション | 숙의 세션 | A complete discussion around one user question. |
| Deliberation State Model | 议事状态模型 | 議事狀態模型 | 熟議状態モデル | 숙의 상태 모델 | State relationship among session, stage, agents, motions, speeches, objections, votes, reservations, and action plan. |
| Session Snapshot | 会话快照 | 會話快照 | セッションスナップショット | 세션 스냅샷 | Validated current state of a Deliberation Session. |
| Session Status | 会话状态 | 會話狀態 | セッション状態 | 세션 상태 | Lifecycle enum for a Deliberation Session. |
| Session Locale | 会话语言区域 | 會話語言地區 | セッションロケール | 세션 로케일 | Locale used for user-visible session output. |
| Deliberation Space | 议事空间 | 議事空間 | 熟議スペース | 숙의 공간 | Persistent or configured space for sessions and agents. |
| Deliberation Flow | 议事流程 | 議事流程 | 熟議フロー | 숙의 흐름 | Ordered stages that guide the session. |
| RONR Protocol | RONR 议事协议 | RONR 議事協議 | RONR 熟議プロトコル | RONR 숙의 프로토콜 | Product-specific protocol adapted from Robert's Rules of Order. |
| RONR Protocol Flow | RONR 议事协议流程 | RONR 議事協議流程 | RONR 熟議プロトコルフロー | RONR 숙의 프로토콜 흐름 | Minimal ordered protocol flow used by a session. |
| Lightweight Procedure | 轻量议事程序 | 輕量議事程序 | 軽量議事手続き | 경량 의사 절차 | MVP version, not full parliamentary procedure. |
| Decision Support | 决策支持 | 決策支援 | 意思決定支援 | 의사결정 지원 | RONR helps users decide; it does not replace user judgment. |
| Default Multilingual Support | 默认多语言支持 | 預設多語言支援 | 既定の多言語対応 | 기본 다국어 지원 | Project-wide rule that every feature and product change maintains multilingual terminology and UI language switching. |
| Multilingual and Glossary Impact | 多语言与术语影响 | 多語言與術語影響 | 多言語および用語への影響 | 다국어 및 용어 영향 | Feature document section for recording terminology and localization impact. |
| Language Switcher | 语言切换器 | 語言切換器 | 言語切替 | 언어 전환기 | UI control for changing the active locale. |
| Locale | 语言区域 | 語言地區 | ロケール | 로케일 | Runtime language and region identifier, such as `zh-CN` or `en`. |
| Translation Key | 翻译键 | 翻譯鍵 | 翻訳キー | 번역 키 | Stable key used to look up localized UI text. |
| Fallback Language | 回退语言 | 備援語言 | フォールバック言語 | 대체 언어 | Language used when a target locale is missing a translation. |
| UI Aesthetic Style | UI 美学风格 | UI 美學風格 | UI 美学スタイル | UI 미학 스타일 | Visual style baseline for RONR Web UI, including token, spacing, radius, color, and interaction rules. |
| Design Token | 设计令牌 | 設計權杖 | デザイントークン | 디자인 토큰 | Named visual value used by UI styles, such as color, radius, border, or focus ring. |
| Focus Ring | 焦点环 | 焦點環 | フォーカスリング | 포커스 링 | Visible outline or shadow that indicates keyboard focus. |
| Web Session Entry | Web 会话入口 | Web 會話入口 | Web セッション入口 | Web 세션 진입점 | Web entry point for creating a Deliberation Session. |
| Minimal Web Deliberation View | 最小 Web 议事视图 | 最小 Web 議事視圖 | 最小 Web 熟議ビュー | 최소 Web 숙의 뷰 | Minimal web view for stages, agent output, votes, and action plan. |

## Agent and Role Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent | 议事代理 | 議事代理 | 熟議エージェント | 숙의 에이전트 | Combination of model, role, mandate, and behavior rules. |
| Model | 模型 | 模型 | モデル | 모델 | Capability source, such as GPT, Claude, DeepSeek, or local models. |
| Model Provider | 模型提供方 | 模型提供方 | モデル提供元 | 모델 제공자 | Vendor or runtime that serves models. |
| Role | 角色 | 角色 | 役割 | 역할 | Base role: Chair, Secretary, or Member. |
| Mandate | 职责授权 | 職責授權 | 任務権限 | 책무 위임 | Specific responsibility assigned to a Member in one session. |
| Chair | 主席 | 主席 | 議長 | 의장 | Required, non-repeatable role controlling the process. |
| Secretary | 秘书 | 秘書 | 書記 | 서기 | Required, non-repeatable role recording trace and output. |
| Member | 议员 | 議員 | 議員 | 의원 | Required, repeatable role that debates, amends, objects, and votes. |
| General Member | 普通议员 | 普通議員 | 一般議員 | 일반 의원 | Member with the `general` mandate. |
| User Advocate | 用户代表 | 使用者代表 | ユーザー代弁者 | 사용자 대변인 | Member mandate focused on user goals and constraints. |
| Domain Expert | 领域专家 | 領域專家 | 領域専門家 | 도메인 전문가 | Member mandate focused on a specific domain. |
| Action Planner | 行动规划者 | 行動規劃者 | 行動計画者 | 실행 계획자 | Member mandate focused on execution and validation steps. |
| Red Team Member | 红队议员 | 紅隊議員 | レッドチーム議員 | 레드팀 의원 | Member mandate focused on failure paths, misuse risk, and hidden cost. |
| Role Governance | 角色治理 | 角色治理 | 役割ガバナンス | 역할 거버넌스 | Rules that keep each agent within its role and mandate. |
| Agent Configuration | Agent 配置 | Agent 配置 | エージェント設定 | 에이전트 구성 | Session-level selection of agents, roles, models, and mandates. |
| Agent Role Runtime | Agent 角色运行时 | Agent 角色執行時 | エージェント役割ランタイム | 에이전트 역할 런타임 | Runtime layer that turns roles and mandates into model tasks. |

## Parliamentary Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| Call to Order | 议题确认 | 議題確認 | 議題確認 | 의제 확인 | First stage where Chair confirms topic and constraints. |
| Main Motion | 主议题 | 主議題 | 主動議 | 주 동의안 | Primary proposal or question to be discussed. |
| Motion | 动议 | 動議 | 動議 | 동의안 | A proposal that can be debated, amended, and voted on. |
| Amendment | 修正案 | 修正案 | 修正案 | 수정안 | Modification to a motion or candidate proposal. |
| Speech | 发言 | 發言 | 発言 | 발언 | Structured contribution from an agent. |
| Floor | 发言权 | 發言權 | 発言権 | 발언권 | Permission to speak in a stage. |
| Objection | 反对意见 | 反對意見 | 異議 | 이의 제기 | Risk, flaw, or alternative view raised against a motion. |
| Clarifying Question | 澄清问题 | 釐清問題 | 確認質問 | 명확화 질문 | Question used to reduce ambiguity before debate or voting. |
| Deliberation | 聚焦讨论 | 聚焦討論 | 熟議 | 숙의 | Focused discussion around motions and objections. |
| Max Deliberation Rounds | 最大讨论轮次 | 最大討論輪次 | 最大熟議ラウンド数 | 최대 숙의 라운드 수 | Optional user-set limit for Deliberation rounds. |
| Deliberation Round Count | 讨论轮次计数 | 討論輪次計數 | 熟議ラウンド数 | 숙의 라운드 수 | Number of completed Deliberation rounds. |
| Convergence Check | 收敛判断 | 收斂判斷 | 収束判定 | 수렴 판단 | AI judgment that decides whether Deliberation can move to vote or consensus. |
| Convergence Status | 收敛状态 | 收斂狀態 | 収束状態 | 수렴 상태 | State describing whether Deliberation has converged, needs more discussion, or reached the round limit. |
| Vote | 表决 | 表決 | 採決 | 표결 | Position record for a motion; `position` is one of `support`, `oppose`, `abstain`, `qualified_support`. |
| Vote Position | 表决立场 | 表決立場 | 採決立場 | 표결 입장 | Enum field on Vote; do not use Reservation as a position value. |
| Motion Status | 动议状态 | 動議狀態 | 動議状態 | 동의안 상태 | Lifecycle enum for a Motion. |
| Objection Type | 反对意见类型 | 反對意見類型 | 異議タイプ | 이의 유형 | Category of an Objection. |
| Objection Severity | 反对意见严重度 | 反對意見嚴重度 | 異議の重大度 | 이의 심각도 | Severity level of an Objection. |
| Resolution Status | 处理状态 | 處理狀態 | 解決状態 | 처리 상태 | State describing how an Objection has been handled. |
| support | 支持 | 支持 | 支持 | 지지 | Vote position: the Agent supports the motion. |
| oppose | 反对 | 反對 | 反対 | 반대 | Vote position: the Agent opposes the motion. |
| abstain | 弃权 | 棄權 | 棄権 | 기권 | Vote position: the Agent does not support or oppose. |
| qualified_support | 有条件支持 | 有條件支持 | 条件付き支持 | 조건부 지지 | Vote position: the Agent supports only under explicit conditions. |
| Consensus | 共识 | 共識 | 合意 | 합의 | Agreement without formal voting, if sufficient. |
| Reservation | 保留意见 | 保留意見 | 留保意見 | 유보 의견 | Non-blocking concern attached to a vote or recommendation; not a Vote.position value. |
| Point of Order | 程序异议 | 程序異議 | 議事進行上の異議 | 의사진행 이의 | Objection about process, not substance. |
| Reopen Stage | 重开阶段 | 重開階段 | 段階の再開 | 단계 재개 | Return to an earlier deliberation stage. |

## Output and Evidence Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| Action Plan | 行动清单 | 行動清單 | 行動計画 | 실행 계획 | Primary final output. |
| Action Item | 行动项 | 行動項 | アクション項目 | 실행 항목 | One executable or verifiable step. |
| Evidence Chain | 证据链 | 證據鏈 | 証拠チェーン | 증거 체인 | User-facing trace from output to deliberation. |
| Deliberation Trace | 议事证据链 | 議事證據鏈 | 熟議トレース | 숙의 추적 기록 | Structured internal trace of speeches, objections, votes, and decisions. |
| Action Plan Trace | 行动清单追溯 | 行動清單追溯 | 行動計画トレース | 실행 계획 추적 | Trace from each Action Item to speeches, objections, votes, reservations, and interruptions. |
| Recommendation | 推荐建议 | 推薦建議 | 推奨事項 | 권고 사항 | Suggested direction or action. |
| Rationale | 理由 | 理由 | 根拠 | 근거 | Reason for a recommendation or action item. |
| Risk | 风险 | 風險 | リスク | 위험 | Potential downside or failure condition. |
| Assumption | 假设 | 假設 | 前提 | 가정 | Condition treated as true unless validated. |
| Condition | 条件 | 條件 | 条件 | 조건 | Requirement or qualifier that must hold for a Vote, Objection resolution, or Action Item. |
| Validation Step | 验证步骤 | 驗證步驟 | 検証ステップ | 검증 단계 | Step to test an assumption or reduce risk. |
| Trade-off | 取舍 | 取捨 | トレードオフ | 트레이드오프 | Benefit-cost tension between options. |
| Source Speech | 来源发言 | 來源發言 | 出典発言 | 출처 발언 | Speech used as evidence for an output item. |
| Source Reference | 来源引用 | 來源引用 | 出典参照 | 출처 참조 | Structured reference to a user input, attachment, speech, objection, vote, reservation, or external source summary. |
| User Interruption Impact | 用户插话影响 | 使用者插話影響 | ユーザー割り込みの影響 | 사용자 개입 영향 | How a user interruption changed an Action Item, constraint, priority, or stage. |
| Minority View | 少数意见 | 少數意見 | 少数意見 | 소수 의견 | Dissenting or non-consensus view preserved in the output. |

## User Interaction Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| User Interruption | 用户插话 | 使用者插話 | ユーザー割り込み | 사용자 개입 | User input during an active session. |
| UserInterruptionType.add_constraint | 补充约束 | 補充約束 | 制約追加 | 제약 추가 | Add or change goals, limits, preferences, background, or light direction changes. |
| UserInterruptionType.ask_followup | 追问 | 追問 | 追加質問 | 후속 질문 | Ask about a speech, risk, motion, or candidate plan. |
| UserInterruptionType.pause | 暂停 | 暫停 | 一時停止 | 일시 중지 | Pause automatic session progress. |
| UserInterruptionType.resume | 恢复 | 恢復 | 再開 | 재개 | Resume session progress after pause. |
| UserInterruptionType.reopen_phase | 重开阶段 | 重開階段 | 段階の再開 | 단계 재개 | Reopen an earlier stage when the prior context must be revisited. |
| UserInterruptionType.cancel_session | 放弃议事 | 放棄議事 | セッション中止 | 세션 취소 | Cancel the current Deliberation Session without completing an Action Plan. |
| Pause | 暂停 | 暫停 | 一時停止 | 일시 중지 | Temporarily stop automatic flow. |
| Resume | 恢复 | 恢復 | 再開 | 재개 | Continue the session after pause or interruption. |
| Cancel Session | 放弃议事 | 放棄議事 | セッション中止 | 세션 취소 | User action that ends the current Deliberation Session without completing an Action Plan. |
| Follow-up Question | 追问 | 追問 | 追加質問 | 후속 질문 | User or agent asks for deeper clarification. |
| Constraint | 约束 | 約束 | 制約 | 제약 조건 | Limit, preference, budget, deadline, or boundary. |
| Override | 覆盖指令 | 覆蓋指令 | 上書き指示 | 재정의 지시 | User instruction that changes the session direction; not a separate interruption enum. |
| Auto Mode | 自动模式 | 自動模式 | 自動モード | 자동 모드 | Session proceeds without user intervention. |
| Manual Intervention | 手动接管 | 手動接管 | 手動介入 | 수동 개입 | User actively directs the session. |

## Web Runtime Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| Model Provider Connection | 模型提供方连接 | 模型提供方連接 | モデル提供元接続 | 모델 제공자 연결 | Capability for connecting Agent Runtime to a model provider. |
| OpenAI-compatible Provider | OpenAI 兼容提供方 | OpenAI 相容提供方 | OpenAI 互換プロバイダー | OpenAI 호환 제공자 | Provider that exposes an OpenAI-compatible API surface. |
| Provider Profile | 提供方配置档案 | 提供方設定檔 | プロバイダープロファイル | 제공자 프로필 | Named provider configuration used by Agent Runtime without exposing secrets. |
| Secret Reference | 密钥引用 | 金鑰引用 | シークレット参照 | 시크릿 참조 | Server-side reference to a secret value, such as an environment variable. |
| Session Template | 会话模板 | 會話模板 | セッションテンプレート | 세션 템플릿 | Reusable session setup with predefined agents and mandates. |
| Quality Review | 质量检查 | 品質檢查 | 品質レビュー | 품질 검토 | Minimum review before final Action Plan output. |

## Implementation Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| State Machine | 状态机 | 狀態機 | 状態機械 | 상태 머신 | Core implementation model for deliberation flow. |
| Stage | 阶段 | 階段 | 段階 | 단계 | One step in the deliberation flow; implementation field name is `phase`. |
| Transition | 状态转换 | 狀態轉換 | 状態遷移 | 상태 전이 | Movement from one stage to another. |
| Event | 事件 | 事件 | イベント | 이벤트 | Input that can trigger a transition. |
| Policy | 策略规则 | 策略規則 | ポリシー | 정책 | Rule for validation, routing, or governance. |
| Guardrail | 护栏 | 護欄 | ガードレール | 가드레일 | Safety or scope constraint. |
| Schema | 结构定义 | 結構定義 | スキーマ | 스키마 | Machine-readable structure for data. |
| Template | 模板 | 模板 | テンプレート | 템플릿 | Reusable configuration for a decision type. |

## State Enum Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| SessionStatus.created | 已创建 | 已建立 | 作成済み | 생성됨 | Session has been created but not yet confirmed. |
| SessionStatus.active | 活动中 | 活動中 | アクティブ | 활성 | Session can continue automatically. |
| SessionStatus.paused | 已暂停 | 已暫停 | 一時停止中 | 일시 중지됨 | Session is waiting for user input or recovery. |
| SessionStatus.completed | 已完成 | 已完成 | 完了 | 완료됨 | Final Action Plan has been produced. |
| SessionStatus.cancelled | 已放弃 | 已放棄 | 中止済み | 취소됨 | User cancelled the session before completion. |
| SessionStatus.failed | 已失败 | 已失敗 | 失敗 | 실패함 | Session cannot recover automatically. |
| MotionStatus.proposed | 已提出 | 已提出 | 提案済み | 제안됨 | Motion has been proposed. |
| MotionStatus.under_deliberation | 讨论中 | 討論中 | 熟議中 | 숙의 중 | Motion is under active deliberation. |
| MotionStatus.amended | 已修正 | 已修正 | 修正済み | 수정됨 | Motion has been amended. |
| MotionStatus.ready_for_vote | 可表决 | 可表決 | 採決可能 | 표결 가능 | Motion is ready for vote or consensus. |
| MotionStatus.adopted | 已采纳 | 已採納 | 採択済み | 채택됨 | Motion has been adopted. |
| MotionStatus.rejected | 未采纳 | 未採納 | 否決済み | 기각됨 | Motion has been rejected. |
| ObjectionType.risk | 风险 | 風險 | リスク | 위험 | Objection about potential failure or harm. |
| ObjectionType.counterexample | 反例 | 反例 | 反例 | 반례 | Objection based on a counterexample. |
| ObjectionType.cost | 成本 | 成本 | コスト | 비용 | Objection about cost or complexity. |
| ObjectionType.constraint_conflict | 约束冲突 | 約束衝突 | 制約との衝突 | 제약 충돌 | Objection about conflict with user constraints. |
| ObjectionType.alternative | 替代方案 | 替代方案 | 代替案 | 대안 | Objection proposing an alternative direction. |
| ObjectionSeverity.low | 低 | 低 | 低 | 낮음 | Low severity. |
| ObjectionSeverity.medium | 中 | 中 | 中 | 보통 | Medium severity. |
| ObjectionSeverity.high | 高 | 高 | 高 | 높음 | High severity. |
| ObjectionSeverity.blocking | 阻断 | 阻斷 | ブロッキング | 차단 | Blocking severity. |
| ResolutionStatus.open | 未处理 | 未處理 | 未対応 | 미처리 | Objection has not been handled. |
| ResolutionStatus.addressed | 已处理 | 已處理 | 対応済み | 처리됨 | Objection has been addressed. |
| ResolutionStatus.accepted_risk | 接受风险 | 接受風險 | リスク受容 | 위험 수용 | Risk is accepted and preserved. |
| ResolutionStatus.converted_to_condition | 已转为条件 | 已轉為條件 | 条件化済み | 조건으로 전환됨 | Objection has become an action condition or validation step. |
| ResolutionStatus.rejected | 不采纳 | 不採納 | 却下済み | 기각됨 | Objection was discussed and rejected. |
| ConvergenceStatus.not_checked | 未判断 | 未判斷 | 未判定 | 미판단 | Convergence has not been checked. |
| ConvergenceStatus.converged | 已收敛 | 已收斂 | 収束済み | 수렴됨 | Deliberation has converged. |
| ConvergenceStatus.not_converged | 未收敛 | 未收斂 | 未収束 | 미수렴 | Deliberation needs more discussion. |
| ConvergenceStatus.round_limit_reached | 已达轮次上限 | 已達輪次上限 | ラウンド上限到達 | 라운드 한도 도달 | Deliberation stopped because the user-set round limit was reached. |
