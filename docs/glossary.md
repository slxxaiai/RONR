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
| Deliberation Record | 议事记录 | 議事記錄 | 熟議記録 | 숙의 기록 | Persisted history entry for one Deliberation Session, including rule type, event log, snapshot, and timestamps. |
| Deliberation Records | 议事记录列表 | 議事記錄列表 | 熟議記録一覧 | 숙의 기록 목록 | History collection shown in the Topic Panel for the current User Reference. |
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
| UI Aesthetic Style | UI 美学风格 | UI 美學風格 | UI 美学スタイル | UI 미학 스타일 | Visual style baseline for RONR Web UI, including token, spacing, radius, color, interaction rules, and three-column workspace layout. |
| Design Token | 设计令牌 | 設計權杖 | デザイントークン | 디자인 토큰 | Named visual value used by UI styles, such as color, radius, border, or focus ring. |
| Focus Ring | 焦点环 | 焦點環 | フォーカスリング | 포커스 링 | Visible outline or shadow that indicates keyboard focus. |
| Web Session Entry | Web 会话入口 | Web 會話入口 | Web セッション入口 | Web 세션 진입점 | Web entry point for creating a Deliberation Session. |
| User Input Attachments | 用户输入附件 | 使用者輸入附件 | ユーザー入力添付 | 사용자 입력 첨부 | Web input capability for adding text, files, or links to a Deliberation Session. |
| New Meeting | 新建会议 | 新建會議 | 新規会議 | 새 회의 | Topic Panel mode for creating a new Deliberation Session. |
| History | 历史会议 | 歷史會議 | 履歴会議 | 기록 회의 | Topic Panel mode for listing prior Deliberation Records. |
| Text Input | 文字输入 | 文字輸入 | テキスト入力 | 텍스트 입력 | User-provided text question or context in the Web entry. |
| File Input | 文件输入 | 檔案輸入 | ファイル入力 | 파일 입력 | User-provided file that must be normalized into a source-tracked context summary. |
| Link Input | 链接输入 | 連結輸入 | リンク入力 | 링크 입력 | User-provided URL that must be normalized into a source-tracked context summary. |
| Attachment Summary | 附件摘要 | 附件摘要 | 添付要約 | 첨부 요약 | Reviewable summary generated from File Input or Link Input before deliberation uses it as context. |
| Next Deliberation Task | 下一步议事任务 | 下一步議事任務 | 次の熟議タスク | 다음 숙의 작업 | Chair-provided next task shown immediately after creating a Deliberation Session. |
| Minimal Web Deliberation View | 最小 Web 议事视图 | 最小 Web 議事視圖 | 最小 Web 熟議ビュー | 최소 Web 숙의 뷰 | Minimal three-column web view for Topic Panel, Meeting Area, Role Configuration Panel, chat-style agent output, votes, and action plan. |
| Topic Panel | 话题区 | 話題區 | トピックパネル | 주제 패널 | Left side panel for the user question, attachments, and Chair-led topic confirmation. |
| Meeting Area | 会议区 | 會議區 | 会議エリア | 회의 영역 | Central area where the AI Agent deliberation output is displayed. |
| Role Configuration Panel | 角色配置区 | 角色設定區 | ロール設定パネル | 역할 구성 패널 | Right side panel for provider status, role models, Member mandates, and round limit. |
| Side Panel | 侧边功能区 | 側邊功能區 | サイドパネル | 사이드 패널 | Collapsible left or right functional panel in the Web workspace. |
| Chat Thread | 群聊议事流 | 群聊議事流 | チャット形式の熟議スレッド | 그룹 채팅 숙의 흐름 | Central message stream used to display AI Agent deliberation output. |
| Chat Message | 群聊发言消息 | 群聊發言訊息 | チャット発言メッセージ | 그룹 채팅 발언 메시지 | One visible Agent message displayed with avatar, role metadata, optional Collapsed Detail, and generated speech content. |
| Agent Turn Message | Agent 回合消息 | Agent 回合訊息 | Agent ターンメッセージ | Agent 턴 메시지 | One Chat Message that combines a single Agent turn's Search Source Citation, Thinking Summary, and Speech instead of splitting them into separate messages. |
| Collapsed Detail | 折叠详情 | 摺疊詳情 | 折りたたみ詳細 | 접힌 상세 | Default-collapsed expandable area inside an Agent Turn Message for Search Source Citation or Thinking Summary. |
| Meeting Output | 会议输出 | 會議輸出 | 会議出力 | 회의 출력 | Output container inside the Meeting Area. |
| Meeting Replay | 会议重放 | 會議重放 | 会議再生 | 회의 재생 | Replaying a saved Deliberation Record from ordered Session Events and Session Snapshot. |
| Speaker Order | 发言顺序 | 發言順序 | 発言順 | 발언 순서 | Ordered speaker list derived from Session Event `sequence` for Meeting Replay. |
| Meeting Status Bar | 会议进度状态栏 | 會議進度狀態列 | 会議進行ステータスバー | 회의 진행 상태 표시줄 | Muted status row in the Meeting Area header that shows current Stage, active Agent, Current Speaker, and session progress state. |
| Streaming Meeting Output | 流式会议输出 | 流式會議輸出 | ストリーミング会議出力 | 스트리밍 회의 출력 | Meeting Output mode that appends safe events as they arrive, including Search Source Citation, Thinking Summary, Speech, and completion. |
| Typewriter Streaming | 逐字流式输出 | 逐字流式輸出 | タイプライター式ストリーミング | 타자식 스트리밍 | UI rendering mode that reveals generated Speech progressively character by character instead of inserting the full content at once. |
| Thinking Summary | 思考摘要 | 思考摘要 | 思考要約 | 사고 요약 | User-visible, low-contrast summary of what the Agent is doing; never raw chain-of-thought. |
| Search Source Citation | 搜索来源引用 | 搜尋來源引用 | 検索出典引用 | 검색 출처 인용 | Visible citation card for a search source, including title, URL, and optional snippet. |
| Search Status | 搜索状态 | 搜尋狀態 | 検索状態 | 검색 상태 | Status attached to a search_sources event, including completed, failed, or unavailable. |
| Search Error Code | 搜索错误代码 | 搜尋錯誤代碼 | 検索エラーコード | 검색 오류 코드 | Provider or runtime error code shown inside Collapsed Detail when search returns no usable sources. |

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
| Domain Focus | 领域焦点 | 領域焦點 | 領域焦点 | 도메인 초점 | Optional field for `domain-expert` Member configuration; default is `product`; rejected for non-domain-expert mandates. |
| technical | 技术 | 技術 | 技術 | 기술 | Domain Focus enum: feasibility, complexity, architecture risk, and delivery cost. |
| product | 产品 | 產品 | プロダクト | 제품 | Domain Focus enum: demand strength, user journey, feature priority, and experience risk. |
| market | 市场 | 市場 | 市場 | 시장 | Domain Focus enum: competition, market size, acquisition path, pricing, and positioning. |
| legal | 法律/合规 | 法律/合規 | 法務/コンプライアンス | 법무/컴플라이언스 | Domain Focus enum: regulation, contract, privacy, intellectual property, and compliance risk. |
| finance | 财务 | 財務 | 財務 | 재무 | Domain Focus enum: budget, cash flow, ROI, and cost structure. |
| industry | 行业/场景 | 產業/場景 | 業界/シナリオ | 산업/시나리오 | Domain Focus enum: user-specified industry or business scenario facts. |
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
| Current Speaker | 当前发言 Agent | 目前發言 Agent | 現在の発言 Agent | 현재 발언 Agent | Agent currently producing or most recently responsible for visible Meeting Output. |
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
| Deliberation Transcript | 议事转录 | 議事轉錄 | 熟議トランスクリプト | 숙의 전사 | Safe ordered transcript of prior Agent turns used as known information and positions for later speakers; excludes Raw Chain-of-Thought. |
| Web Search Before Speech | 发言前联网搜索 | 發言前聯網搜尋 | 発言前Web検索 | 발언 전 웹 검색 | Required runtime step where an Agent searches external information before expressing a view. |
| Search Intent | 搜索意图 | 搜尋意圖 | 検索意図 | 검색 의도 | Role-, mandate-, stage-, and prior-context-aware search query used before an Agent speaks. |
| Search Result Summary | 搜索结果摘要 | 搜尋結果摘要 | 検索結果要約 | 검색 결과 요약 | Structured summary of search results with source references. |
| Search Source | 搜索来源 | 搜尋來源 | 検索ソース | 검색 출처 | Source returned by web search and referenced by Agent output. |
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
| User Reference | 用户引用 | 使用者引用 | ユーザー参照 | 사용자 참조 | Stable identifier used to associate Deliberation Records before a full account system exists. |
| Local Anonymous User | 本地匿名用户 | 本地匿名使用者 | ローカル匿名ユーザー | 로컬 익명 사용자 | Current no-login user model stored in the browser and mapped to User Reference. |
| Meeting Rule Type | 会议规则类型 | 會議規則類型 | 会議規則タイプ | 회의 규칙 유형 | Enum that records which deliberation rule system a session used. |
| MeetingRuleType.robert_rules | 罗伯特议事规则 | 羅伯特議事規則 | ロバート議事規則 | 로버트 의사규칙 | Current Meeting Rule Type value for Robert's Rules of Order based sessions. |
| robert_rules | 罗伯特议事规则 | 羅伯特議事規則 | ロバート議事規則 | 로버트 의사규칙 | Protocol enum value for `MeetingRuleType.robert_rules`. |
| Search Provider | 搜索提供方 | 搜尋提供方 | 検索プロバイダー | 검색 제공자 | Provider or tool used to retrieve web search results. |
| Thinking Mode | Thinking 模式 | Thinking 模式 | Thinking モード | Thinking 모드 | Provider or runtime configuration that enables deeper model reasoning without exposing raw reasoning text. |
| Thinking Budget | Thinking 预算 | Thinking 預算 | Thinking 予算 | Thinking 예산 | Optional reasoning token, effort, or budget configuration. |
| Raw Chain-of-Thought | 原始推理链 | 原始推理鏈 | 生の思考過程 | 원시 사고 과정 | Internal model reasoning text that must not be stored or shown. |
| Session Template | 会话模板 | 會話模板 | セッションテンプレート | 세션 템플릿 | Reusable session setup with predefined agents and mandates. |
| Quality Review | 质量检查 | 品質檢查 | 品質レビュー | 품질 검토 | Minimum review before final Action Plan output. |

## Implementation Terms

| Canonical Term | 简体中文 | 繁體中文 | Japanese | Korean | Notes |
| --- | --- | --- | --- | --- | --- |
| State Machine | 状态机 | 狀態機 | 状態機械 | 상태 머신 | Core implementation model for deliberation flow. |
| Record Repository | 记录仓库 | 記錄倉庫 | 記録リポジトリ | 기록 저장소 | Storage-neutral interface for creating, listing, reading, and replaying Deliberation Records. |
| SQLite Adapter | SQLite 适配器 | SQLite 適配器 | SQLite アダプター | SQLite 어댑터 | Current local persistence implementation behind Record Repository. |
| Postgres Adapter | Postgres 适配器 | Postgres 適配器 | Postgres アダプター | Postgres 어댑터 | Future cloud persistence implementation behind the same Record Repository contract. |
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
