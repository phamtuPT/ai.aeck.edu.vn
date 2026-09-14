import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ChatTurn } from '../types';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

// Các mô hình có safety classifier: bật server-side fallback để yêu cầu bị từ chối
// được chạy lại trên mô hình dự phòng thay vì trả về lỗi.
const FALLBACK_MODELS = new Set(['claude-opus-5', 'claude-fable-5-1']);

function toMessages(messages: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
    return messages.map(m => {
        const text = m.text.trim() || '(trống)';
        if (m.role === 'assistant') {
            return { role: 'assistant', content: text };
        }
        const images = (m.images || [])
            .filter((img): img is { mimeType: SupportedImageType; data: string } =>
                (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(img.mimeType))
            .map(img => ({
                type: 'image' as const,
                source: { type: 'base64' as const, media_type: img.mimeType, data: img.data },
            }));
        return { role: 'user', content: [...images, { type: 'text' as const, text }] };
    });
}

export const anthropicProvider: AIProvider = {
    async *streamChat({ apiKey, model, system, messages, maxOutputTokens, signal }) {
        const client = new Anthropic({ apiKey });
        const useFallback = FALLBACK_MODELS.has(model);
        const stream = client.beta.messages.stream(
            {
                model,
                max_tokens: maxOutputTokens,
                system,
                messages: toMessages(messages),
                ...(useFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
            },
            { signal }
        );

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield event.delta.text;
            }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
            yield '\n\n_(Claude đã từ chối trả lời yêu cầu này.)_';
        } else if (final.stop_reason === 'max_tokens') {
            yield '\n\n_(Câu trả lời bị cắt do vượt giới hạn độ dài.)_';
        }
    },

    async generateText({ apiKey, model, prompt, maxOutputTokens }) {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model,
            max_tokens: maxOutputTokens,
            messages: [{ role: 'user', content: prompt }],
        });
        return response.content
            .map(block => (block.type === 'text' ? block.text : ''))
            .join('')
            .trim();
    },

    async listModels(apiKey) {
        const client = new Anthropic({ apiKey });
        const ids: string[] = [];
        for await (const m of client.models.list()) ids.push(m.id);
        return ids;
    },
};
