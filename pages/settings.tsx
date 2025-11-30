import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast } from 'sonner';

export default function SettingsPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState('');
    const [user, setUser] = useState<any>(null);
    const [models, setModels] = useState<any[]>([]);
    const [showModels, setShowModels] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('user_gemini_api_key');
        if (storedKey) setApiKey(storedKey);

        const userData = localStorage.getItem('chatbot_user');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    const handleSave = () => {
        if (!apiKey.trim()) {
            toast.error('API Key không được để trống');
            return;
        }
        localStorage.setItem('user_gemini_api_key', apiKey.trim());
        toast.success('Đã lưu API Key');
    };

    const handleRemove = () => {
        localStorage.removeItem('user_gemini_api_key');
        setApiKey('');
        toast.success('Đã xóa API Key');
    };

    const fetchModels = async () => {
        if (!apiKey) return;
        setIsLoadingModels(true);
        const toastId = toast.loading('Đang tải danh sách model...');
        try {
            const res = await fetch(`/api/models?key=${apiKey}`);
            const data = await res.json();
            if (res.ok && data.models) {
                setModels(data.models);
                setShowModels(true);
                toast.success('Đã tải danh sách model', { id: toastId });
            } else {
                toast.error(`Lỗi: ${data.error || 'Không thể tải model'}`, { id: toastId });
            }
        } catch (error) {
            toast.error('Lỗi kết nối', { id: toastId });
        } finally {
            setIsLoadingModels(false);
        }
    };

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

                    {/* API Key Section */}
                    <div className="bg-[#1e1f20] rounded-2xl p-6 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            Cấu hình API Key
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            API Key của bạn được lưu trữ cục bộ trên trình duyệt và được sử dụng để kết nối với Google Gemini.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Gemini API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Nhập API Key của bạn..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 focus:ring-0 outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Lưu thay đổi
                                </button>
                                {apiKey && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                const toastId = toast.loading('Đang kiểm tra API Key...');
                                                try {
                                                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${apiKey}`);
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        toast.success('API Key hoạt động tốt!', { id: toastId });
                                                    } else {
                                                        toast.error(`Lỗi: ${data.error?.message || 'Key không hợp lệ'}`, { id: toastId });
                                                    }
                                                } catch (error) {
                                                    toast.error('Không thể kết nối đến Google API', { id: toastId });
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-blue-500/10 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                                        >
                                            Kiểm tra Key
                                        </button>
                                        <button
                                            onClick={fetchModels}
                                            disabled={isLoadingModels}
                                            className="px-6 py-2.5 bg-purple-500/10 text-purple-400 font-semibold rounded-xl hover:bg-purple-500/20 transition-colors border border-purple-500/20 disabled:opacity-50"
                                        >
                                            Danh sách Model
                                        </button>
                                        <button
                                            onClick={handleRemove}
                                            className="px-6 py-2.5 bg-red-500/10 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"
                                        >
                                            Xóa Key
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Models List Modal/Section */}
                    {showModels && (
                        <div className="bg-[#1e1f20] rounded-2xl p-6 border border-white/10 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Danh sách Model khả dụng
                                </h2>
                                <button onClick={() => setShowModels(false)} className="text-gray-400 hover:text-white">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {models.map((model: any) => (
                                    <div key={model.name} className="p-3 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-purple-300">{model.displayName}</h3>
                                                <p className="text-xs text-gray-500 mt-1 font-mono">{model.name}</p>
                                            </div>
                                            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{model.version}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{model.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
