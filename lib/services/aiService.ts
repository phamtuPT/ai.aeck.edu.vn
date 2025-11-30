import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '@/lib/prompts';
import { ContextItem } from '@/types/chat';

export interface GenerateStreamParams {
    apiKey: string;
    message: string;
    history: any[];
    images: string[];
    context: ContextItem[];
}

export async function generateStream({
    apiKey,
    message,
    history,
    images,
    context
}: GenerateStreamParams) {
    const ai = new GoogleGenAI({ apiKey });

    // Format context for the AI
    let contextText = '';
    if (context && context.length > 0) {
        contextText = "\n\nThông tin tham khảo từ cơ sở dữ liệu (Sử dụng thông tin này để trả lời và trích dẫn nguồn):\n";
        context.forEach((item) => {
            contextText += `[Nguồn: ExamID=${item.examId}, QuestionID=${item.id}]\nNội dung: ${item.content}\n`;
            if (item.explanation) contextText += `Giải thích: ${item.explanation}\n`;
            contextText += '---\n';
        });
    }

    // Construct contents for Gemini
    const contents: any[] = [];

    // Add history
    if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
            const parts: any[] = [{ text: msg.content }];
            if (msg.images && Array.isArray(msg.images)) {
                msg.images.forEach((img: string) => {
                    const match = img.match(/^data:(.*?);base64,(.*)$/);
                    if (match) {
                        parts.push({
                            inlineData: {
                                mimeType: match[1],
                                data: match[2]
                            }
                        });
                    }
                });
            }
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: parts
            });
        });
    }

    // Add current message with context
    const currentParts: any[] = [{ text: message + contextText }]; // Inject context
    if (images && Array.isArray(images)) {
        images.forEach((img: string) => {
            const match = img.match(/^data:(.*?);base64,(.*)$/);
            if (match) {
                currentParts.push({
                    inlineData: {
                        mimeType: match[1],
                        data: match[2]
                    }
                });
            }
        });
    }
    contents.push({
        role: 'user',
        parts: currentParts
    });

    const result = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents: contents,
        config: {
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            maxOutputTokens: 2000,
        }
    });

    return { result, aiClient: ai };
}
