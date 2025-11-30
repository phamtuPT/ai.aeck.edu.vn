import React from 'react';
import renderMathContent from '@/lib/renderMath';

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    images?: string[];
}

interface ChatMessagesProps {
    messages: ChatMessage[];
    loading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessages({ messages, loading, messagesEndRef }: ChatMessagesProps) {
    const suggestions = [
        "Giải thích bài toán này",
        "Tạo đề thi mẫu",
        "Tóm tắt kiến thức",
        "Tìm kiếm tài liệu"
    ];

    return (
        <div className="max-w-[800px] mx-auto pt-8 pb-12">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                    <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 shadow-xl border border-white/10 backdrop-blur-sm">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">
                        Xin chào! Tôi có thể giúp gì?
                    </h2>
                    <p className="text-gray-400 mb-10 max-w-md text-lg">
                        Trợ lý AI thông minh sẵn sàng hỗ trợ bạn giải đáp thắc mắc và học tập hiệu quả.
                    </p>

                    <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl text-left transition-all duration-200 group"
                            >
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white">{s}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`group animate-slide-up ${msg.role === 'user' ? 'flex justify-end' : 'flex gap-4'}`}>
                        {msg.role === 'user' ? (
                            <div className="flex flex-col items-end max-w-[85%]">
                                {msg.images && msg.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 justify-end">
                                        {msg.images.map((img, i) => (
                                            <img key={i} src={img} alt="User upload" className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-white/10 shadow-md" />
                                        ))}
                                    </div>
                                )}
                                {msg.content && (
                                    <div className="bg-[#1e1f20] text-white px-6 py-3.5 rounded-2xl rounded-tr-sm shadow-lg leading-relaxed text-[15px]">
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex-shrink-0 mt-1">
                                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-white p-0.5">
                                        <img src="/avt_chatbot.jpg" alt="AI" className="w-full h-full object-cover rounded-full bg-black" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="pl-2 py-2">
                                        <div
                                            className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-li:text-gray-300 max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-4 last:[&>p]:mb-0 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: renderMathContent(msg.content) }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-4 animate-fade-in">
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-white p-0.5">
                                <img src="/avt_chatbot.jpg" alt="AI" className="w-full h-full object-cover rounded-full bg-black" />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 pl-2 py-3 h-fit">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
            </div>
            <div ref={messagesEndRef} />
        </div>
    );
}
