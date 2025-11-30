import React from 'react';

interface SettingsModalProps {
    showSettings: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    onSave: () => void;
}

export default function SettingsModal({
    showSettings,
    onClose,
    apiKey,
    setApiKey,
    onSave
}: SettingsModalProps) {
    if (!showSettings) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1f20] rounded-2xl w-full max-w-md p-6 border border-[#444746] shadow-2xl">
                <h2 className="text-xl font-medium text-[#e3e3e3] mb-4">Cài đặt API Key</h2>
                <div className="text-[#c4c7c5] text-sm mb-6 space-y-3">
                    <p>Để sử dụng Trợ giảng AI, bạn cần có <strong>Google Gemini API Key</strong> (miễn phí).</p>
                    <div className="bg-[#131314] p-3 rounded-lg border border-[#444746]">
                        <p className="font-medium text-[#e3e3e3] mb-2">Hướng dẫn lấy Key:</p>
                        <ol className="list-decimal list-inside space-y-1 pl-1">
                            <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#7cacf8] hover:underline">Google AI Studio</a>.</li>
                            <li>Đăng nhập và tạo API key mới.</li>
                            <li>Copy và dán vào bên dưới.</li>
                        </ol>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-medium text-[#c4c7c5] mb-1">API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-[#131314] border border-[#444746] rounded-lg px-3 py-2 text-[#e3e3e3] focus:border-[#7cacf8] focus:ring-1 focus:ring-[#7cacf8] outline-none transition-all"
                        placeholder="Dán API Key của bạn vào đây..."
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[#c4c7c5] hover:text-[#e3e3e3] font-medium transition-colors"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={onSave}
                        disabled={!apiKey.trim()}
                        className="px-4 py-2 bg-[#0b57d0] hover:bg-[#0b57d0]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#e3e3e3] rounded-full font-medium transition-colors"
                    >
                        Lưu Key
                    </button>
                </div>
            </div>
        </div>
    );
}
