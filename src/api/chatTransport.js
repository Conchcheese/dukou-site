import { callModel } from "./modelClient.js";
import { PROVIDER_PRESETS, getModelSettings, getTransportSettings } from "../store/settings.js";

const EMPTY_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const DEFAULT_BACKEND_GATEWAY_URL = "/v1/chat/completions";

function getBackendGatewayUrl() {
  return String(import.meta.env.VITE_BACKEND_GATEWAY_URL || DEFAULT_BACKEND_GATEWAY_URL).trim();
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function callBackendGateway({ messages, systemPrompt, modelSettings, signal }) {
  const url = getBackendGatewayUrl();
  if (!url) throw new Error("缺少 Backend Gateway URL");

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer frontend-gateway",
    },
    body: JSON.stringify({
      model: modelSettings?.model || import.meta.env.VITE_BACKEND_MODEL || "gpt-5.5",
      temperature: Number(modelSettings?.temperature ?? 0.8),
      max_tokens: Number(modelSettings?.maxTokens ?? 1000),
      stream: false,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  const data = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Backend Gateway 请求失败 ${response.status}`);
  }

  return {
    ok: true,
    text: data?.choices?.[0]?.message?.content || "",
    reasoningContent: data?.choices?.[0]?.message?.reasoning_content || "",
    reasoningSource: data?.choices?.[0]?.message?.reasoning_content ? "reasoning_content" : undefined,
    usage: {
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    transport: "backend_gateway",
  };
}

const KIWI_LOCAL_PLACEHOLDER_KEY = "dukou-kiwi-local";

export function normalizeChatTransport(value) {
  return ["mock", "direct_model", "kiwi_direct", "backend_gateway"].includes(value) ? value : "mock";
}

export function isPlaceholderChatTransport(value) {
  const chatTransport = normalizeChatTransport(value);
  return chatTransport === "backend_gateway";
}

export function getChatTransportLabel(value) {
  const chatTransport = normalizeChatTransport(value);
  return {
    mock: "mock",
    direct_model: "direct_model",
    kiwi_direct: "kiwi_direct",
    backend_gateway: "backend_gateway",
  }[chatTransport];
}

export async function sendChatRequest({
  messages,
  systemPrompt,
  modelSettings = getModelSettings(),
  transportSettings = getTransportSettings(),
  signal,
  mockText = "我在。<split>本地 mock 可以跑。",
}) {
  const chatTransport = normalizeChatTransport(transportSettings?.chatTransport);

  if (chatTransport === "mock") {
    return {
      ok: true,
      text: mockText,
      reasoningContent: "",
      reasoningSource: undefined,
      usage: EMPTY_USAGE,
      transport: chatTransport,
    };
  }

  if (chatTransport === "direct_model") {
    return callModel({ messages, systemPrompt, settings: modelSettings, signal });
  }

  if (chatTransport === "kiwi_direct") {
    const kiwiPreset = PROVIDER_PRESETS.kiwi_local;
    const usesKiwiLocal = modelSettings?.provider === "kiwi_local";
    return callModel({
      messages,
      systemPrompt,
      settings: {
        ...modelSettings,
        provider: "kiwi_local",
        apiStyle: "openai_compatible",
        baseUrl: usesKiwiLocal ? modelSettings.baseUrl || kiwiPreset.baseUrl : kiwiPreset.baseUrl,
        model: usesKiwiLocal ? modelSettings.model || kiwiPreset.defaultModel : kiwiPreset.defaultModel,
        apiKey: KIWI_LOCAL_PLACEHOLDER_KEY,
      },
      signal,
    });
  }

  if (chatTransport === "backend_gateway") {
    try {
      return await callBackendGateway({ messages, systemPrompt, modelSettings, signal });
    } catch (error) {
      return {
        ok: false,
        text: "",
        reasoningContent: "",
        reasoningSource: undefined,
        usage: EMPTY_USAGE,
        transport: chatTransport,
        error: {
          type: "backend_gateway",
          message: error?.message || "Backend Gateway 请求失败",
        },
      };
    }
  }

  return {
    ok: false,
    text: "",
    reasoningContent: "",
    reasoningSource: undefined,
    usage: EMPTY_USAGE,
    transport: chatTransport,
    error: {
      type: "config",
      message: "未知聊天通道",
    },
  };
}
