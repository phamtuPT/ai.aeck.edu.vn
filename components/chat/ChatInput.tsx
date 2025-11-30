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
    onPaste
}: ChatInputProps) {
    return (
        <div className="absolute bottom-0 left-0 right-0 bg-[#131314] pt-2 pb-6 px-4 z-10">
            <div className="max-w-[800px] mx-auto">
                <div className="relative bg-[#1e1f20] rounded-[28px] border border-[#444746]/50 hover:bg-[#2b2c2d] transition-colors focus-within:bg-[#2b2c2d] focus-within:shadow-md">
                    <form onSubmit={onSendMessage} className="flex flex-col">
                        {selectedImages.length > 0 && (
                            <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
                                {selectedImages.map((img, idx) => (
                                    <div key={idx} className="relative group">
                                        <img src={img} alt="Selected" className="h-16 w-16 object-cover rounded-lg border border-[#444746]" />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveImage(idx)}
                                            className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center px-4 pt-3 pb-3 gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333537] rounded-full transition-colors"
                                title="Tải ảnh lên"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileSelect}
                                accept="image/*"
                                multiple
                                className="hidden"
                            />
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={onPaste}
                                placeholder="Hỏi Trợ giảng AI bất cứ điều gì..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-[#e3e3e3] placeholder-[#c4c7c5] px-3 py-2 text-base"
                                disabled={loading}
                            />
                            {(input.trim() || selectedImages.length > 0) && (
                                <button
                                    type="submit"
                                    className="p-2 text-[#e3e3e3] bg-[#0b57d0] hover:bg-[#0b57d0]/90 rounded-full transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
                <p className="text-center text-xs text-[#c4c7c5] mt-3">
                    Trợ giảng AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
                </p>
            </div>
        </div>
    );
}
