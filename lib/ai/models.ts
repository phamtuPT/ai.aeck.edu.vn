// Danh mục mô hình dùng chung cho client và server (không chứa bí mật).
// Cập nhật lần cuối: 09/2026. Khi hãng ra mô hình mới / tắt mô hình cũ, chỉ cần sửa file này.

export type ProviderId = 'gemini' | 'openai' | 'anthropic';

export interface ProviderInfo {
    id: ProviderId;
    label: string;
    keyPlaceholder: string;
    keyUrl: string;
    /** Mô hình rẻ dùng cho tác vụ phụ (đặt tiêu đề, tóm tắt lịch sử). */
    utilityModel: string;
}

export interface ModelInfo {
    id: string;
    provider: ProviderId;
    label: string;
    description: string;
    tier: 'flagship' | 'balanced' | 'fast';
    supportsImages: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
    gemini: {
        id: 'gemini',
        label: 'Google Gemini',
        keyPlaceholder: 'AIza...',
        keyUrl: 'https://aistudio.google.com/apikey',
        utilityModel: 'gemini-3.1-flash-lite',
    },
    openai: {
        id: 'openai',
        label: 'OpenAI (ChatGPT)',
        keyPlaceholder: 'sk-...',
        keyUrl: 'https://platform.openai.com/api-keys',
        utilityModel: 'gpt-5.6-luna',
    },
    anthropic: {
        id: 'anthropic',
        label: 'Anthropic Claude',
        keyPlaceholder: 'sk-ant-...',
        keyUrl: 'https://platform.claude.com/settings/keys',
        utilityModel: 'claude-haiku-4-5',
    },
};

export const MODELS: ModelInfo[] = [
    // Google Gemini
    { id: 'gemini-3.8-flash', provider: 'gemini', label: 'Gemini 3.8 Flash', description: 'Mới nhất, nhanh và thông minh', tier: 'balanced', supportsImages: true },
    { id: 'gemini-3.1-pro-preview', provider: 'gemini', label: 'Gemini 3.1 Pro (Preview)', description: 'Suy luận sâu, không có free tier', tier: 'flagship', supportsImages: true },
    { id: 'gemini-3.5-flash-lite', provider: 'gemini', label: 'Gemini 3.5 Flash-Lite', description: 'Rẻ, phản hồi rất nhanh', tier: 'fast', supportsImages: true },
    { id: 'gemini-3.1-flash-lite', provider: 'gemini', label: 'Gemini 3.1 Flash-Lite', description: 'Rẻ nhất', tier: 'fast', supportsImages: true },
    { id: 'gemini-2.5-flash', provider: 'gemini', label: 'Gemini 2.5 Flash', description: 'Thế hệ cũ', tier: 'balanced', supportsImages: true },

    // OpenAI
    { id: 'gpt-6-astra', provider: 'openai', label: 'GPT-6 Astra', description: 'Mạnh nhất của OpenAI, giá cao', tier: 'flagship', supportsImages: true },
    { id: 'gpt-5.6-sol', provider: 'openai', label: 'GPT-5.6 Sol', description: 'Flagship cho công việc chuyên sâu', tier: 'flagship', supportsImages: true },
    { id: 'gpt-5.6-terra', provider: 'openai', label: 'GPT-5.6 Terra', description: 'Cân bằng giữa chất lượng và giá', tier: 'balanced', supportsImages: true },
    { id: 'gpt-5.6-luna', provider: 'openai', label: 'GPT-5.6 Luna', description: 'Nhanh, rẻ', tier: 'fast', supportsImages: true },

    // Anthropic Claude
    { id: 'claude-fable-5-1', provider: 'anthropic', label: 'Claude Fable 5.1', description: 'Suy luận khó nhất, giá cao', tier: 'flagship', supportsImages: true },
    { id: 'claude-opus-5', provider: 'anthropic', label: 'Claude Opus 5', description: 'Flagship, rất giỏi giải thích', tier: 'flagship', supportsImages: true },
    { id: 'claude-sonnet-5', provider: 'anthropic', label: 'Claude Sonnet 5', description: 'Cân bằng giữa chất lượng và giá', tier: 'balanced', supportsImages: true },
    { id: 'claude-haiku-4-5', provider: 'anthropic', label: 'Claude Haiku 4.5', description: 'Nhanh, rẻ', tier: 'fast', supportsImages: true },
];

export const DEFAULT_MODEL_ID = 'gemini-3.8-flash';

export function getModel(id: string | null | undefined): ModelInfo | undefined {
    return MODELS.find(m => m.id === id);
}

// Tên khóa localStorage cho API key của từng hãng.
export const API_KEY_STORAGE: Record<ProviderId, string> = {
    gemini: 'user_gemini_api_key',
    openai: 'user_openai_api_key',
    anthropic: 'user_anthropic_api_key',
};

export const SELECTED_MODEL_STORAGE = 'chatbot_selected_model';
