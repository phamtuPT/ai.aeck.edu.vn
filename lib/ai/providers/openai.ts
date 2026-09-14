import OpenAI from 'openai';
import type { AIProvider, ChatTurn } from '../types';

function toInput(messages: ChatTurn[]): OpenAI.Responses.ResponseInput {
    return messages.map(m => {
        if (m.role === 'assistant') {
            return { role: 'assistant' as const, content: m.text };
        }
        return {
            role: 'user' as const,
            content: [
                { type: 'input_text' as const, text: m.text },
                ...(m.images || []).map(img => ({
                    type: 'input_image' as const,
                    image_url: `data:${img.mimeType};base64,${img.data}`,
                    detail: 'auto' as const,
                })),
            ],
        };
    });
}

export const openaiProvider: AIProvider = {
    async *streamChat({ apiKey, model, system, messages, maxOutputTokens, signal }) {
        const client = new OpenAI({ apiKey });
        const stream = await client.responses.create(
            {
                model,
                instructions: system,
                input: toInput(messages),
                // Với mô hình suy luận, token suy luận cũng tính vào giới hạn này.
                max_output_tokens: maxOutputTokens,
                store: false,
                stream: true,
            },
            { signal }
        );
        for await (const event of stream) {
            if (event.type === 'response.output_text.delta') {
                yield event.delta;
            } else if (event.type === 'response.refusal.delta') {
                yield event.delta;
            } else if (event.type === 'response.failed') {
                throw new Error(event.response.error?.message || 'OpenAI response failed');
            } else if (event.type === 'error') {
                throw new Error(event.message || 'OpenAI stream error');
            }
        }
    },

    async generateText({ apiKey, model, prompt, maxOutputTokens }) {
        const client = new OpenAI({ apiKey });
        const response = await client.responses.create({
            model,
            input: prompt,
            max_output_tokens: maxOutputTokens,
            reasoning: { effort: 'none' },
            store: false,
        });
        return response.output_text?.trim() || '';
    },

    async listModels(apiKey) {
        const client = new OpenAI({ apiKey });
        const ids: string[] = [];
        for await (const m of client.models.list()) ids.push(m.id);
        return ids;
    },
};
