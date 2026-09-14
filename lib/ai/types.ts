export interface ChatImage {
    mimeType: string;
    /** Base64, không có tiền tố data: */
    data: string;
}

/** Tin nhắn trung lập, mỗi provider tự chuyển sang định dạng của hãng. */
export interface ChatTurn {
    role: 'user' | 'assistant';
    text: string;
    images?: ChatImage[];
}

export interface StreamChatParams {
    apiKey: string;
    model: string;
    system: string;
    messages: ChatTurn[];
    maxOutputTokens: number;
    signal?: AbortSignal;
}

export interface GenerateTextParams {
    apiKey: string;
    model: string;
    prompt: string;
    maxOutputTokens: number;
}

export interface AIProvider {
    streamChat(params: StreamChatParams): AsyncIterable<string>;
    generateText(params: GenerateTextParams): Promise<string>;
    /** Gọi một endpoint rẻ để kiểm tra key, trả về danh sách id mô hình key truy cập được. */
    listModels(apiKey: string): Promise<string[]>;
}

const DATA_URL_RE = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]*)$/;

export function parseDataUrl(url: string): ChatImage | null {
    const match = url.match(DATA_URL_RE);
    return match ? { mimeType: match[1], data: match[2] } : null;
}
