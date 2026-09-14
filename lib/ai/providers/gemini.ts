import { GoogleGenAI } from '@google/genai';
import type { AIProvider, ChatTurn } from '../types';

function toContents(messages: ChatTurn[]) {
    return messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [
            { text: m.text },
            ...(m.images || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
        ],
    }));
}

export const geminiProvider: AIProvider = {
    async *streamChat({ apiKey, model, system, messages, maxOutputTokens, signal }) {
        const ai = new GoogleGenAI({ apiKey });
        const stream = await ai.models.generateContentStream({
            model,
            contents: toContents(messages),
            config: {
                systemInstruction: system,
                maxOutputTokens,
                abortSignal: signal,
            },
        });
        for await (const chunk of stream) {
            if (chunk.text) yield chunk.text;
        }
    },

    async generateText({ apiKey, model, prompt, maxOutputTokens }) {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { maxOutputTokens },
        });
        return result.text?.trim() || '';
    },

    async listModels(apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const pager = await ai.models.list();
        const ids: string[] = [];
        for await (const m of pager) {
            if (m.name) ids.push(m.name.replace(/^models\//, ''));
        }
        return ids;
    },
};
