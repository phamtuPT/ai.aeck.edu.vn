import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { API_KEY_STORAGE, PROVIDERS, type ProviderId } from '@/lib/ai/models';

const PROVIDER_ORDER: ProviderId[] = ['gemini', 'openai', 'anthropic'];

interface SupportedModel {
    id: string;
    label: string;
    available: boolean;
}

function ProviderKeyCard({ providerId }: { providerId: ProviderId }) {
    const provider = PROVIDERS[providerId];
    const storageKey = API_KEY_STORAGE[providerId];
    const [apiKey, setApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');
    const [checking, setChecking] = useState(false);
    const [supported, setSupported] = useState<SupportedModel[] | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey) || '';
        setApiKey(stored);
        setSavedKey(stored);
    }, [storageKey]);

    const handleSave = () => {
        const trimmed = apiKey.trim();
        if (!trimmed) {
            toast.error('API Key không được để trống');
            return;
        }
        localStorage.setItem(storageKey, trimmed);
        setSavedKey(trimmed);
        toast.success(`Đã lưu API Key ${provider.label}`);
    };

    const handleRemove = () => {
        localStorage.removeItem(storageKey);
        setApiKey('');
        setSavedKey('');
        setSupported(null);
        toast.success(`Đã xóa API Key ${provider.label}`);
    };

    const handleCheck = async () => {
        const trimmed = apiKey.trim();
        if (!trimmed) return;
        setChecking(true);
        const toastId = toast.loading('Đang kiểm tra API Key...');
        try {
            const res = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-api-key': trimmed },
                body: JSON.stringify({ provider: providerId }),
            });
            const data = await res.json();
            if (res.ok) {
                setSupported(data.supported || []);
                toast.success('API Key hoạt động tốt!', { id: toastId });
            } else {
                setSupported(null);
                toast.error(`Lỗi: ${data.error || 'Key không hợp lệ'}`, { id: toastId });
            }
        } catch {
            toast.error('Lỗi kết nối', { id: toastId });
        } finally {
            setChecking(false);
        }
    };

    const isDirty = apiKey.trim() !== savedKey;

    return (
        <div className="bg-[#1e1f20] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold">{provider.label}</h2>
                {savedKey ? (
                    <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-lg border border-green-500/20">Đã lưu key</span>
                ) : (
                    <span className="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-lg border border-white/10">Chưa có key</span>
                )}
            </div>
            <p className="text-sm text-gray-400 mb-4">
                Lấy API Key tại{' '}
                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                    {provider.keyUrl.replace(/^https:\/\//, '')}
                </a>
            </p>

            <div className="space-y-4">
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider.keyPlaceholder}
                    autoComplete="off"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 focus:ring-0 outline-none transition-all"
                />

                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="px-5 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-40"
                    >
                        Lưu
                    </button>
                    {apiKey && (
                        <button
                            onClick={handleCheck}
                            disabled={checking}
                            className="px-5 py-2.5 bg-blue-500/10 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/20 transition-colors border border-blue-500/20 disabled:opacity-50"
                        >
                            Kiểm tra key
                        </button>
                    )}
                    {savedKey && (
                        <button
                            onClick={handleRemove}
                            className="px-5 py-2.5 bg-red-500/10 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"
                        >
                            Xóa key
                        </button>
                    )}
                </div>

                {supported && (
                    <div className="space-y-1.5 pt-2">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Mô hình trong hệ thống</p>
                        {supported.map(m => (
                            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-black/20 rounded-xl border border-white/5">
                                <div className="min-w-0">
                                    <div className="text-sm text-gray-200">{m.label}</div>
                                    <div className="text-xs text-gray-500 font-mono truncate">{m.id}</div>
                                </div>
                                {m.available ? (
                                    <span className="text-xs text-green-400 flex-shrink-0">Dùng được</span>
                                ) : (
                                    <span className="text-xs text-yellow-400 flex-shrink-0">Key chưa có quyền</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('chatbot_user');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20">
            <Head>
                <title>Cài đặt - Trợ giảng AI</title>
            </Head>

            <div className="max-w-2xl mx-auto p-6">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h1 className="text-2xl font-bold">Cài đặt</h1>
                </div>

                <div className="space-y-6">
                    {/* User Profile Section */}
                    <div className="bg-[#1e1f20] rounded-2xl p-6 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Thông tin tài khoản
                        </h2>
                        {user ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Tên hiển thị</label>
                                    <p className="text-gray-200">{user.fullName}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Tên đăng nhập</label>
                                    <p className="text-gray-200">{user.username}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Email</label>
                                    <p className="text-gray-200">{user.email}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400">Chưa đăng nhập</p>
                        )}
                    </div>

                    {/* API Keys */}
                    <div className="px-1">
                        <h2 className="text-lg font-semibold mb-1">API Key</h2>
                        <p className="text-sm text-gray-400">
                            Nhập key của ít nhất một hãng để chat. Key chỉ được lưu trên trình duyệt này, được gửi kèm từng tin nhắn để gọi AI
                            và không được lưu trên máy chủ. Chi phí sử dụng tính vào tài khoản của chính bạn tại hãng đó.
                        </p>
                    </div>
                    {PROVIDER_ORDER.map(id => (
                        <ProviderKeyCard key={id} providerId={id} />
                    ))}
                </div>
            </div>
        </div>
    );
}
