import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';

export default function ChatPage() {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, []);
    const {
        messages,
        input,
        setInput,
        loading,
        isThinking,
        attachments,
        messagesEndRef,
        fileInputRef,
        scrollContainerRef,
        handleScroll,
        user,
        apiKey,
        setApiKey,
        conversations,
        conversationId,
        handleSendMessage,
        handleNewChat,
        selectConversation,
        handleFileSelect,
        removeAttachment,
        handlePaste,
        deleteConversation,
        handleRename,
        togglePin,
        toggleArchive,
        handleLogout,
        stopGeneration,
        selectedMode,
        setSelectedMode
    } = useChat();

    const onNewChat = () => {
        handleNewChat();
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const onSelectConversation = (id: string) => {
        selectConversation(id);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe && sidebarOpen && window.innerWidth < 768) {
            setSidebarOpen(false);
        }
        if (isRightSwipe && !sidebarOpen && window.innerWidth < 768) {
            setSidebarOpen(true);
        }
    };

    return (
        <div
            className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative selection:bg-white/20"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <Head>
                <title>Trợ giảng AI</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <ChatSidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                conversations={conversations}
                conversationId={conversationId}
                onNewChat={onNewChat}
                onSelectConversation={onSelectConversation}
                onRenameConversation={handleRename}
                onTogglePin={togglePin}
                onToggleArchive={toggleArchive}
                onDeleteConversation={deleteConversation}
                user={user}
                onLogout={handleLogout}
                onOpenSettings={() => router.push('/settings')}
            />

            <main className="flex-1 flex flex-col relative min-w-0 z-10 w-full">
                <div className="absolute top-4 left-4 z-30 md:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className={`p-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-lg ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
                    </button>
                </div>

                {!sidebarOpen && (
                    <div className="absolute top-4 left-4 z-50 hidden md:block">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
                        </button>
                    </div>
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-2 md:px-4 pb-32 md:pb-48 scroll-smooth custom-scrollbar"
                >
                    <ChatMessages
                        messages={messages}
                        loading={loading}
                        isThinking={isThinking}
                        messagesEndRef={messagesEndRef}
                    />
                </div>

                <ChatInput
                    input={input}
                    setInput={setInput}
                    onSendMessage={handleSendMessage}
                    onFileSelect={handleFileSelect}
                    fileInputRef={fileInputRef}
                    attachments={attachments}
                    onRemoveAttachment={removeAttachment}
                    loading={loading}
                    onPaste={handlePaste}
                    stopGeneration={stopGeneration}
                    selectedMode={selectedMode}
                    setSelectedMode={setSelectedMode}
                />
            </main>
        </div>
    );
}
