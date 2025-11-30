import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSendMessage: (e: React.FormEvent) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    attachments: { name: string; type: string; url: string }[];
    onRemoveAttachment: (index: number) => void;
    loading: boolean;
    onPaste: (e: React.ClipboardEvent) => void;
    stopGeneration: () => void;
    selectedMode: 'general' | 'math' | 'reading' | 'science';
    setSelectedMode: (mode: 'general' | 'math' | 'reading' | 'science') => void;
}

export default function ChatInput({
    input,
    setInput,
    onSendMessage,
    onFileSelect,
    fileInputRef,
    attachments,
    onRemoveAttachment,
    loading,
    onPaste,
    stopGeneration,
    selectedMode,
    setSelectedMode
}: ChatInputProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const modes = [
        { id: 'general', label: 'Tổng quan', description: 'Trả lời nhanh và đa dụng' },
        { id: 'math', label: 'Tư duy Toán học', description: 'Giải toán chi tiết, step-by-step' },
        { id: 'reading', label: 'Tư duy Đọc hiểu', description: 'Phân tích văn bản sâu sắc' },
        { id: 'science', label: 'Tư duy Khoa học', description: 'Lý giải hiện tượng tự nhiên' }
    ];

    const currentModeLabel = modes.find(m => m.id === selectedMode)?.label || 'Tổng quan';

    return (
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 z-10 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pb-4 md:pb-6 pt-6 md:pt-10">
            <div className="max-w-[800px] mx-auto relative">
                <div
                    className="relative bg-[#1e1f20] rounded-[24px] border border-white/10 shadow-2xl shadow-black/50 transition-all duration-300 group focus-within:border-white/30 cursor-text"
                    onClick={() => textareaRef.current?.focus()}
                >
                    <form onSubmit={onSendMessage} className="flex flex-col min-h-[120px]">
                        {/* Attachments Preview */}
                        {attachments.length > 0 && (
                            <div className="px-4 pt-3 flex gap-2 overflow-x-auto custom-scrollbar">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="relative group/img flex-shrink-0">
                                        {file.type.startsWith('image/') ? (
                                            <img src={file.url} alt={file.name} className="h-16 w-16 object-cover rounded-xl border border-white/10" />
                                        ) : (
                                            <div className="h-16 w-16 flex flex-col items-center justify-center bg-white/10 rounded-xl border border-white/10">
                                                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                <span className="text-[10px] text-gray-400 truncate w-14 text-center mt-1">{file.name}</span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onRemoveAttachment(idx)}
                                            className="absolute -top-2 -right-2 bg-white text-black rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all shadow-md transform scale-90 group-hover/img:scale-100"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Textarea Area */}
                        <div className="flex-1 px-4 pt-4">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={onPaste}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (!loading) {
                                            onSendMessage(e as any);
                                        }
                                    }
                                }}
                                placeholder="Hỏi Trợ giảng AI bất cứ điều gì..."
                                className="w-full bg-transparent border-none outline-none shadow-none ring-0 focus:ring-0 text-white placeholder-gray-500 text-base resize-none custom-scrollbar"
                                disabled={loading}
                                style={{ height: 'auto', minHeight: '48px' }}
                            />
                        </div>

                        {/* Bottom Toolbar */}
                        <div className="flex items-center justify-between px-2 pb-2 mt-2">
                            {/* Left Actions */}
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center w-10 h-10"
                                    title="Thêm tệp đính kèm"
                                    disabled={loading}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={onFileSelect}
                                    accept="image/*,.pdf,.docx,.txt"
                                    multiple
                                    className="hidden"
                                />

                                {/* Placeholder Tools Button */}
                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
                                    title="Công cụ (Sắp ra mắt)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="hidden sm:inline">Công cụ</span>
                                </button>
                            </div>

                            {/* Right Actions */}
                            <div className="flex items-center gap-2">
                                {/* Mode Selector */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors bg-[#2a2b2d] hover:bg-[#353638] px-3 py-1.5 rounded-lg border border-white/5"
                                    >
                                        {currentModeLabel}
                                        <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#1e1f20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl p-2">
                                            <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Chọn mô hình
                                            </div>
                                            {modes.map((mode) => (
                                                <button
                                                    key={mode.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedMode(mode.id as any);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center justify-between group ${selectedMode === mode.id ? 'bg-[#2a2b2d]' : 'hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div>
                                                        <div className={`text-sm font-medium ${selectedMode === mode.id ? 'text-white' : 'text-gray-200'}`}>
                                                            {mode.label}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            {mode.description}
                                                        </div>
                                                    </div>
                                                    {selectedMode === mode.id && (
                                                        <div className="text-blue-400 bg-blue-400/10 p-1 rounded-full">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Placeholder Mic Button */}
                                <button
                                    type="button"
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors w-10 h-10 flex items-center justify-center"
                                    title="Nhập bằng giọng nói (Sắp ra mắt)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>

                                {/* Send/Stop Button */}
                                {loading ? (
                                    <button
                                        type="button"
                                        onClick={stopGeneration}
                                        className="p-2 rounded-full bg-white text-black hover:bg-gray-200 transition-all duration-300 shadow-lg w-10 h-10 flex items-center justify-center"
                                        title="Dừng lại"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim() && attachments.length === 0}
                                        className={`p-2 rounded-full transition-all duration-300 w-10 h-10 flex items-center justify-center ${(input.trim() || attachments.length > 0)
                                            ? 'bg-white text-black hover:bg-gray-200 shadow-lg'
                                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
                <p className="text-center text-xs text-gray-500 mt-3 font-medium">
                    Trợ giảng AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
                </p>
            </div>
        </div>
    );
}
