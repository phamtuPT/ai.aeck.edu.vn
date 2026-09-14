import { SYSTEM_INSTRUCTION, MATH_PROMPT, READING_PROMPT, SCIENCE_PROMPT } from '@/lib/prompts';
import { ContextItem } from '@/types/chat';
import { getProvider } from '@/lib/ai';
import type { ModelInfo } from '@/lib/ai/models';
import type { ChatImage, ChatTurn } from '@/lib/ai/types';

export type ChatMode = 'general' | 'math' | 'reading' | 'science';

export interface GenerateStreamParams {
    apiKey: string;
    model: ModelInfo;
    message: string;
    history: ChatTurn[];
    images: ChatImage[];
    context: ContextItem[];
    mode?: ChatMode;
    signal?: AbortSignal;
}

const MODE_PROMPTS: Record<ChatMode, string> = {
    general: SYSTEM_INSTRUCTION,
    math: MATH_PROMPT,
    reading: READING_PROMPT,
    science: SCIENCE_PROMPT,
};

// Đủ chỗ cho lời giải toán nhiều bước và cho token suy luận của các mô hình thinking.
const MAX_OUTPUT_TOKENS = 16000;

export function generateStream({
    apiKey,
    model,
    message,
    history,
    images,
    context,
    mode = 'general',
    signal,
}: GenerateStreamParams): AsyncIterable<string> {
    let contextText = '';
    if (context && context.length > 0) {
        contextText = "\n\nThông tin tham khảo từ cơ sở dữ liệu (Sử dụng thông tin này để trả lời và trích dẫn nguồn):\n";
        context.forEach((item) => {
            contextText += `[Nguồn: ExamID=${item.examId}, QuestionID=${item.id}]\nNội dung: ${item.content}\n`;
            if (item.explanation) contextText += `Giải thích: ${item.explanation}\n`;
            contextText += '---\n';
        });
    }

    const messages: ChatTurn[] = [
        ...history,
        { role: 'user', text: message + contextText, images: model.supportsImages ? images : [] },
    ];

    return getProvider(model.provider).streamChat({
        apiKey,
        model: model.id,
        system: MODE_PROMPTS[mode] || SYSTEM_INSTRUCTION,
        messages,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        signal,
    });
}
