import type { AIProvider } from './types';
import type { ProviderId } from './models';

// Nạp SDK của từng hãng khi cần: SDK của một hãng lỗi (vd: sai phiên bản Node)
// sẽ chỉ báo lỗi cho hãng đó thay vì làm sập cả route.
const loaders: Record<ProviderId, () => Promise<AIProvider>> = {
    gemini: () => import('./providers/gemini').then(m => m.geminiProvider),
    openai: () => import('./providers/openai').then(m => m.openaiProvider),
    anthropic: () => import('./providers/anthropic').then(m => m.anthropicProvider),
};

export function getProvider(id: ProviderId): Promise<AIProvider> {
    return loaders[id]();
}

/** Rút gọn lỗi từ SDK thành thông báo an toàn để hiển thị cho người dùng. */
export function describeAIError(error: unknown): { status: number; message: string } {
    const err = error as { status?: number; name?: string; message?: string };
    const status = typeof err?.status === 'number' ? err.status : undefined;
    const raw = String(err?.message || '');

    if (status === 401 || status === 403 || /api key not valid|invalid.*api.?key|incorrect api key|authentication/i.test(raw)) {
        return { status: 401, message: 'API Key không hợp lệ hoặc không có quyền dùng mô hình này.' };
    }
    if (status === 404 || /not found|does not exist|model_not_found/i.test(raw)) {
        return { status: 400, message: 'Mô hình không tồn tại hoặc key của bạn chưa được cấp quyền dùng mô hình này.' };
    }
    if (status === 429 || /quota|rate limit|resource.?exhausted/i.test(raw)) {
        return { status: 429, message: 'Đã vượt hạn mức (quota/rate limit) của API Key. Vui lòng thử lại sau hoặc đổi mô hình.' };
    }
    if (status === 400) {
        return { status: 400, message: `Yêu cầu không hợp lệ: ${raw.slice(0, 200)}` };
    }
    return { status: 502, message: 'Nhà cung cấp AI đang gặp lỗi. Vui lòng thử lại.' };
}
