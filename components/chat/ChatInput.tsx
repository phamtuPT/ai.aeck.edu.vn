import React from 'react';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSendMessage: (e: React.FormEvent) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    selectedImages: string[];
    onRemoveImage: (index: number) => void;
    loading: boolean;
    onPaste: (e: React.ClipboardEvent) => void;
    stopGeneration: () => void;
}

export default function ChatInput({
    input,
    setInput,
    onSendMessage,
    onFileSelect,
    fileInputRef,
    selectedImages,
    onRemoveImage,
    loading,
    onPaste,
    stopGeneration
}: ChatInputProps) {
    return (
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 z-10 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pb-4 md:pb-6 pt-6 md:pt-10">
            <div className="max-w-[800px] mx-auto relative">
                <div className="relative bg-[#1e1f20]/50 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-2xl shadow-black/50 transition-all duration-300 group focus-within:border-white/30">
                    <form onSubmit={onSendMessage} className="flex flex-col">
                        {selectedImages.length > 0 && (
                            <div className="px-4 pt-3 flex gap-2 overflow-x-auto custom-scrollbar">
                                {selectedImages.map((img, idx) => (
                                    <div key={idx} className="relative group/img flex-shrink-0">
                                        <img src={img} alt="Selected" className="h-16 w-16 object-cover rounded-xl border border-white/10" />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveImage(idx)}
                                            className="absolute -top-2 -right-2 bg-white text-black rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all shadow-md transform scale-90 group-hover/img:scale-100"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-end px-2 py-2 gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                title="Tải ảnh lên"
                                disabled={loading}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileSelect}
                                accept="image/*"
                                multiple
                                className="hidden"
                            />
                            <textarea
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
                                className="flex-1 bg-transparent border-none outline-none shadow-none ring-0 focus:ring-0 text-white placeholder-gray-500 px-2 py-3 text-base resize-none max-h-32 min-h-[48px] custom-scrollbar"
                                disabled={loading}
                                rows={1}
                                style={{ height: 'auto', minHeight: '48px' }}
                            />
                            <div className="pb-1 pr-1">
                                {loading ? (
                                    <button
                                        type="button"
                                        onClick={stopGeneration}
                                        className="p-2.5 rounded-xl bg-white text-black hover:bg-gray-200 transition-all duration-300 shadow-lg transform hover:-translate-y-0.5"
                                        title="Dừng lại"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim() && selectedImages.length === 0}
                                        className={`p-2.5 rounded-xl transition-all duration-300 ${(input.trim() || selectedImages.length > 0)
                                            ? 'bg-white text-black hover:bg-gray-200 shadow-lg transform hover:-translate-y-0.5'
                                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
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
