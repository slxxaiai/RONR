import type { Locale } from "@ronr/contracts";

type TranslationKey =
  | "app.title"
  | "provider.config"
  | "provider.loading"
  | "provider.loaded"
  | "roles.title"
  | "roles.chair"
  | "roles.secretary"
  | "roles.member"
  | "roles.mandate"
  | "session.question"
  | "session.question.placeholder"
  | "session.start"
  | "session.running"
  | "session.result"
  | "session.noModel"
  | "error.unknownRequest"
  | "result.actionPlanTrace"
  | "language.label";

const zhCN: Record<TranslationKey, string> = {
  "app.title": "RONR AI 议事",
  "provider.config": "Provider 配置",
  "provider.loading": "正在加载模型列表",
  "provider.loaded": "个模型已加载",
  "roles.title": "角色配置",
  "roles.chair": "Chair",
  "roles.secretary": "Secretary",
  "roles.member": "Member",
  "roles.mandate": "Mandate",
  "session.question": "个人决策问题",
  "session.question.placeholder": "例如：我应该先做个人版还是团队版？",
  "session.start": "启动议事",
  "session.running": "议事运行中",
  "session.result": "议事结果",
  "session.noModel": "无可用模型",
  "error.unknownRequest": "请求失败，请检查服务端状态。",
  "result.actionPlanTrace": "Action Plan Trace",
  "language.label": "Locale"
};

const translations: Partial<Record<Locale, Partial<Record<TranslationKey, string>>>> = {
  "zh-CN": zhCN,
  "zh-TW": {
    ...zhCN,
    "provider.config": "Provider 設定",
    "roles.title": "角色設定",
    "session.start": "啟動議事"
  },
  en: {
    ...zhCN,
    "provider.config": "Provider Configuration",
    "roles.title": "Role Configuration",
    "provider.loaded": "models loaded",
    "roles.mandate": "Mandate",
    "session.question": "Personal decision question",
    "session.question.placeholder": "Example: should I build the personal version or team version first?",
    "session.start": "Start Deliberation",
    "session.running": "Deliberation running",
    "session.result": "Deliberation result",
    "session.noModel": "No model",
    "error.unknownRequest": "Request failed. Check the server status."
  },
  ja: {
    ...zhCN,
    "provider.config": "Provider 設定",
    "roles.title": "ロール設定",
    "session.start": "熟議を開始"
  },
  ko: {}
};

export const locales: Locale[] = ["zh-CN", "zh-TW", "en", "ja", "ko"];

export function getTranslation(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations["zh-CN"]?.[key] ?? key;
}

export function createTranslator(locale: Locale): (key: TranslationKey) => string {
  return (key) => getTranslation(locale, key);
}
