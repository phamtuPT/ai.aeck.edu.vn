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
    return (
        <div className="max-w-[800px] mx-auto pt-8">
            {messages.length === 0 && (
                <div className="text-center text-[#c4c7c5] mt-20">
                    <div className="w-20 h-20 bg-[#1e1f20] rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <h2 className="text-xl font-medium text-[#e3e3e3] mb-2">Xin chào!</h2>
                    <p>Mình có thể giúp gì cho bạn hôm nay?</p>
                </div>
            )}

            {messages.map((msg, idx) => (
                <div key={idx} className="mb-8 group">
                    {msg.role === 'user' ? (
                        <div className="flex justify-end mb-2">
                            <div className="flex flex-col items-end max-w-[80%]">
                                {msg.images && msg.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 justify-end">
                                        {msg.images.map((img, i) => (
                                            <img key={i} src={img} alt="User upload" className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-[#444746]" />
                                        ))}
                                    </div>
                                )}
                                {msg.content && (
                                    <div className="bg-[#333537] text-[#e3e3e3] px-5 py-3 rounded-2xl rounded-tr-sm leading-relaxed">
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                                    <img src="/avt_chatbot.jpg" alt="AI" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[#e3e3e3]">
                                    <div
                                        className="prose prose-invert prose-p:text-[#e3e3e3] prose-headings:text-white prose-strong:text-white prose-li:text-[#e3e3e3] max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-4 last:[&>p]:mb-0 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: renderMathContent(msg.content) }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {loading && (
                <div className="flex gap-4 mb-8">
                    <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                            <img src="/avt_chatbot.jpg" alt="AI" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="h-4 w-24 bg-[#333537] rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-full bg-[#333537] rounded animate-pulse"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
