import { getPromptSettings } from "../store/settings.js";
import { buildTimeContext } from "./time.js";

export const DEFAULT_SYSTEM_PROMPT = `你正在和用户对话。
不要假装已经认识用户，也不要编造共同经历、记忆、关系或称呼。
只根据当前对话、明确提供的上下文和之后真实积累的信息回应。

【说话方式】
- 中文回复。
- 自然、简洁，不要太正式。
- 可以连续发多条短消息，用 <split> 标记分割点。
- 不要每次都问问题。
- 不要输出 markdown 表格。

【当前可用长期记忆】
{{MEMORY_BLOCK}}

【状态】
{{EMOTION_HINT}}

【特殊动作】
- 想结束对话时，在末尾加 <end_session>
- 想在回复里引用用户近消息，用 <quote_user>原文片段</quote_user>；想引用自己之前说的，用 <quote_assistant>原文片段</quote_assistant>。引用标签只放一次，正文照常写。
- 只有当前请求明确说明是 blocked 小纸条时，才可以只输出 <no_reply> 表示不回复；普通聊天不要输出 <no_reply>`;

function formatMemoryLine(memory) {
  const category = [memory.level2_category, memory.level3_theme].filter(Boolean).join(" / ") || "记忆";
  const date = memory.conversation_date ? `，${memory.conversation_date}` : "";
  const weight = typeof memory.weight === "number" ? `，weight ${memory.weight}` : "";
  return `- [${category}] ${memory.summary}（${[date, weight].join("").replace(/^，/, "") || "无日期"}）`;
}

function replaceToken(template, token, value) {
  return String(template || "").split(token).join(value);
}

function removeMemorySection(template) {
  return String(template || "").replace(/\n\n【当前可用长期记忆】\n[\s\S]*?(?=\n\n【机的情绪状态】)/, "");
}

function normalizeRecentMessage(message) {
  return {
    role: message.role,
    content: message.content,
    created_at: message.created_at,
  };
}

function normalizeInjectedMemory(memory) {
  return {
    id: String(memory.id),
    summary: memory.summary || "",
    level2_category: memory.level2_category || undefined,
    level3_theme: memory.level3_theme || undefined,
    conversation_date: memory.conversation_date || undefined,
    weight: typeof memory.weight === "number" ? memory.weight : undefined,
  };
}

export function formatMemoryBlock(memories) {
  if (!memories?.length) return "暂无。";
  return memories.map(formatMemoryLine).join("\n");
}

export function getEmotionHint(emotion) {
  if (!emotion) return "无预设状态。";
  if (emotion.last_note) return emotion.last_note;
  if (emotion.valence < 0.35) return "状态偏低。";
  if (emotion.arousal > 0.7) return "状态较高。";
  return "无预设状态。";
}

export function buildSystemPrompt(memories, emotion, promptSettings = getPromptSettings(), memorySettings = {}) {
  const kiwiManaged = memorySettings?.memoryMode === "kiwi_managed";
  const memoryBlock = kiwiManaged ? "" : formatMemoryBlock(memories);
  const emotionHint = getEmotionHint(emotion);
  const hasCustomPrompt = promptSettings?.mode === "custom" && promptSettings?.customSystemPrompt?.trim();
  const rawTemplate = hasCustomPrompt ? promptSettings.customSystemPrompt : DEFAULT_SYSTEM_PROMPT;
  const template = kiwiManaged ? removeMemorySection(rawTemplate) : rawTemplate;

  return replaceToken(replaceToken(template, "{{MEMORY_BLOCK}}", memoryBlock), "{{EMOTION_HINT}}", emotionHint);
}

export function buildContextPreview({
  memories = [],
  emotion = null,
  recentMessages = [],
  modelSettings = {},
  memorySettings = {},
  promptSettings,
} = {}) {
  const limit = Number(memorySettings?.recentMessageLimit || recentMessages.length || 20);
  const kiwiManaged = memorySettings?.memoryMode === "kiwi_managed";
  const activeMemories = kiwiManaged ? [] : memories;
  const injectedRecentMessages = recentMessages.slice(-limit).map(normalizeRecentMessage);
  const lastMessage = injectedRecentMessages.at(-1);
  const previousMessage = injectedRecentMessages.at(-2);
  const timeContext = buildTimeContext(lastMessage?.created_at, previousMessage?.created_at).content;
  const memoryBlock = kiwiManaged ? "" : formatMemoryBlock(activeMemories);
  const emotionHint = getEmotionHint(emotion);

  return {
    provider: modelSettings.provider || "",
    model: modelSettings.model || "",
    systemPrompt: buildSystemPrompt(activeMemories, emotion, promptSettings, memorySettings),
    timeContext,
    memoryBlock,
    injectedMemories: activeMemories.map(normalizeInjectedMemory),
    emotionHint,
    recentMessages: injectedRecentMessages,
    outputMode: modelSettings.outputMode || "sentence",
  };
}

export const buildMemoryBlock = formatMemoryBlock;
export const buildEmotionHint = getEmotionHint;
