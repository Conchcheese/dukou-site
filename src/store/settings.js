const LEGACY_SETTINGS_KEY = "dukou:settings";

export const STORAGE_KEYS = {
  modelSettings: "dukou:modelSettings",
  uiSettings: "dukou:uiSettings",
  memorySettings: "dukou:memorySettings",
  transportSettings: "dukou:transportSettings",
  promptSettings: "dukou:promptSettings",
  contextLogs: "dukou:contextLogs",
  localUserId: "dukou:localUserId",
};

export const PROVIDER_PRESETS = {
  deepseek: {
    label: "DeepSeek",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  kimi: {
    label: "Kimi",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "",
  },
  glm: {
    label: "GLM",
    apiStyle: "openai_compatible",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "",
  },
  openai: {
    label: "OpenAI",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "",
  },
  openrouter: {
    label: "OpenRouter",
    apiStyle: "openai_compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "",
  },
  claude: {
    label: "Claude",
    apiStyle: "anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "",
  },
  kiwi_local: {
    label: "Kiwi Local",
    apiStyle: "openai_compatible",
    baseUrl: "http://127.0.0.1:8080/v1",
    defaultModel: "qwen-plus-2025-12-01",
  },
  custom_openai_compatible: {
    label: "Custom",
    apiStyle: "openai_compatible",
    baseUrl: "",
    defaultModel: "",
  },
};

export const DEFAULT_MODEL_SETTINGS = {
  provider: import.meta.env.VITE_MODEL_PROVIDER || "custom_openai_compatible",
  apiStyle: "openai_compatible",
  apiKey: "",
  baseUrl: import.meta.env.VITE_MODEL_BASE_URL || "",
  model: import.meta.env.VITE_BACKEND_MODEL || import.meta.env.VITE_MODEL_NAME || "gpt-5.5",
  temperature: 0.8,
  maxTokens: 1000,
  outputMode: "sentence",
};

export const DEFAULT_MEMORY_SETTINGS = {
  memoryMode: "kiwi_managed",
  injectedMemoryLimit: 8,
  recentMessageLimit: 20,
  saveContextLogs: true,
  contextLogLimit: 10,
};

export const DEFAULT_TRANSPORT_SETTINGS = {
  chatTransport: import.meta.env.VITE_CHAT_TRANSPORT || "backend_gateway",
};

export const DEFAULT_PROMPT_SETTINGS = {
  mode: "default",
  customSystemPrompt: "",
};

export const DEFAULT_UI_SETTINGS = {
  theme: "light",
  duName: "AI",
  userName: "我",
  duAvatarImage: "",
  userAvatarImage: "",
  duAvatarOpacity: 1,
  userAvatarOpacity: 1,
  chatBackgroundImage: "",
  chatBackgroundOpacity: 0.22,
  chatBackgroundBlur: 0,
  chatHeaderColor: "#f4f1eb",
  chatHeaderOpacity: 1,
  chatHeaderBlur: 0,
  chatInputColor: "#ffffff",
  chatInputOpacity: 1,
  chatInputBlur: 0,
  duBubbleColor: "",
  userBubbleColor: "",
  chatBubbleOpacity: 1,
  chatBubbleBlur: 0,
};

export const DEFAULT_SETTINGS = {
  model: DEFAULT_MODEL_SETTINGS,
  memory: DEFAULT_MEMORY_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  transport: DEFAULT_TRANSPORT_SETTINGS,
  prompt: DEFAULT_PROMPT_SETTINGS,
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson(key) {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function removeItem(key) {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(key);
  }
}

function mergeModelSettings(value) {
  const merged = {
    ...DEFAULT_MODEL_SETTINGS,
    ...(value || {}),
  };

  if (!PROVIDER_PRESETS[merged.provider]) {
    merged.provider = DEFAULT_MODEL_SETTINGS.provider;
  }

  if (merged.provider === "kiwi_local") {
    merged.apiStyle = "openai_compatible";
    merged.baseUrl = merged.baseUrl || PROVIDER_PRESETS.kiwi_local.baseUrl;
    merged.model = merged.model || PROVIDER_PRESETS.kiwi_local.defaultModel;
    merged.apiKey = "";
  }

  return merged;
}

function mergeMemorySettings(value) {
  const merged = {
    ...DEFAULT_MEMORY_SETTINGS,
    ...(value || {}),
  };

  merged.memoryMode = value?.memoryMode || value?.mode || merged.memoryMode;
  if (!["mock", "kiwi_managed"].includes(merged.memoryMode)) {
    merged.memoryMode = "mock";
  }
  delete merged.mode;
  delete merged.chatTransport;
  return merged;
}

function mergeTransportSettings(value, legacyMemory = {}) {
  const merged = {
    ...DEFAULT_TRANSPORT_SETTINGS,
    ...(value || {}),
  };

  merged.chatTransport = value?.chatTransport || legacyMemory?.chatTransport || value?.mode || merged.chatTransport;
  if (!["mock", "direct_model", "kiwi_direct", "backend_gateway"].includes(merged.chatTransport)) {
    merged.chatTransport = "mock";
  }
  delete merged.mode;
  return merged;
}

function mergePromptSettings(value) {
  const merged = {
    ...DEFAULT_PROMPT_SETTINGS,
    ...(value || {}),
  };

  if (merged.mode !== "custom") {
    merged.mode = "default";
    merged.customSystemPrompt = "";
  }

  return merged;
}

function sanitizeDisplayName(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 8) : fallback;
}

function sanitizeImageValue(value) {
  const text = String(value || "");
  return text.startsWith("data:image/") ? text : "";
}

function sanitizeOpacity(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function sanitizeBlur(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(18, Math.max(0, number));
}

function sanitizeGlassBlur(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(24, Math.max(0, number));
}

function sanitizeColor(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
}

function mergeUiSettings(value) {
  const ui = {
    ...DEFAULT_UI_SETTINGS,
    ...(value || {}),
  };

  ui.theme = ui.theme === "dark" ? "dark" : "light";
  ui.duName = sanitizeDisplayName(ui.duName, DEFAULT_UI_SETTINGS.duName);
  ui.userName = sanitizeDisplayName(ui.userName, DEFAULT_UI_SETTINGS.userName);
  ui.duAvatarImage = sanitizeImageValue(ui.duAvatarImage);
  ui.userAvatarImage = sanitizeImageValue(ui.userAvatarImage);
  ui.duAvatarOpacity = sanitizeOpacity(ui.duAvatarOpacity, DEFAULT_UI_SETTINGS.duAvatarOpacity);
  ui.userAvatarOpacity = sanitizeOpacity(ui.userAvatarOpacity, DEFAULT_UI_SETTINGS.userAvatarOpacity);
  ui.chatBackgroundImage = sanitizeImageValue(ui.chatBackgroundImage);
  ui.chatBackgroundOpacity = sanitizeOpacity(ui.chatBackgroundOpacity, DEFAULT_UI_SETTINGS.chatBackgroundOpacity);
  ui.chatBackgroundBlur = sanitizeBlur(ui.chatBackgroundBlur, DEFAULT_UI_SETTINGS.chatBackgroundBlur);
  ui.chatHeaderColor = sanitizeColor(ui.chatHeaderColor, DEFAULT_UI_SETTINGS.chatHeaderColor);
  ui.chatHeaderOpacity = sanitizeOpacity(ui.chatHeaderOpacity, DEFAULT_UI_SETTINGS.chatHeaderOpacity);
  ui.chatHeaderBlur = sanitizeGlassBlur(ui.chatHeaderBlur, DEFAULT_UI_SETTINGS.chatHeaderBlur);
  ui.chatInputColor = sanitizeColor(ui.chatInputColor, DEFAULT_UI_SETTINGS.chatInputColor);
  ui.chatInputOpacity = sanitizeOpacity(ui.chatInputOpacity, DEFAULT_UI_SETTINGS.chatInputOpacity);
  ui.chatInputBlur = sanitizeGlassBlur(ui.chatInputBlur, DEFAULT_UI_SETTINGS.chatInputBlur);
  ui.duBubbleColor = sanitizeColor(ui.duBubbleColor, DEFAULT_UI_SETTINGS.duBubbleColor);
  ui.userBubbleColor = sanitizeColor(ui.userBubbleColor, DEFAULT_UI_SETTINGS.userBubbleColor);
  ui.chatBubbleOpacity = sanitizeOpacity(ui.chatBubbleOpacity, DEFAULT_UI_SETTINGS.chatBubbleOpacity);
  ui.chatBubbleBlur = sanitizeGlassBlur(ui.chatBubbleBlur, DEFAULT_UI_SETTINGS.chatBubbleBlur);
  delete ui.duAvatarPreset;
  delete ui.userAvatarPreset;
  delete ui.chatBackground;

  return ui;
}

function mergeSettings(value) {
  return {
    model: mergeModelSettings(value?.model),
    memory: mergeMemorySettings(value?.memory),
    transport: mergeTransportSettings(value?.transport, value?.memory),
    ui: mergeUiSettings(value?.ui),
    prompt: mergePromptSettings(value?.prompt),
  };
}

export function applyUiSettings(uiSettings = getSettings().ui) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = uiSettings.theme === "dark" ? "dark" : "light";
}

function persistSplitSettings(settings) {
  writeJson(STORAGE_KEYS.modelSettings, settings.model);
  writeJson(STORAGE_KEYS.memorySettings, settings.memory);
  writeJson(STORAGE_KEYS.transportSettings, settings.transport);
  writeJson(STORAGE_KEYS.uiSettings, settings.ui);
  writeJson(STORAGE_KEYS.promptSettings, settings.prompt);
  removeItem(LEGACY_SETTINGS_KEY);
}

export function getSettings() {
  if (!canUseLocalStorage()) return mergeSettings();

  const legacy = readJson(LEGACY_SETTINGS_KEY);
  const split = {
    model: readJson(STORAGE_KEYS.modelSettings),
    memory: readJson(STORAGE_KEYS.memorySettings),
    transport: readJson(STORAGE_KEYS.transportSettings),
    ui: readJson(STORAGE_KEYS.uiSettings),
    prompt: readJson(STORAGE_KEYS.promptSettings),
  };
  const hasSplitSettings = Object.values(split).some(Boolean);

  if (legacy && !hasSplitSettings) {
    const migrated = mergeSettings(legacy);
    persistSplitSettings(migrated);
    return migrated;
  }

  if (legacy && hasSplitSettings) {
    removeItem(LEGACY_SETTINGS_KEY);
  }

  return mergeSettings(split);
}

export function saveSettings(settings) {
  const next = mergeSettings(settings);
  persistSplitSettings(next);
  applyUiSettings(next.ui);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dukou:settings-changed"));
  }

  return next;
}

export function getModelSettings() {
  return getSettings().model;
}

export function getMemorySettings() {
  return getSettings().memory;
}

export function getTransportSettings() {
  return getSettings().transport;
}

export function getPromptSettings() {
  return getSettings().prompt;
}

export function clearModelApiKey() {
  const current = getSettings();
  return saveSettings({
    ...current,
    model: {
      ...current.model,
      apiKey: "",
    },
  });
}

export function clearLocalSecrets() {
  const current = getSettings();
  return saveSettings({
    ...current,
    model: {
      ...current.model,
      apiKey: "",
    },
  });
}
