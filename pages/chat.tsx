import React, { useState, useEffect } from 'react';
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
        selectedImages,
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
        removeImage,
        handlePaste,
        deleteConversation,
        handleRename,
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

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative selection:bg-white/20">
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
                        messagesEndRef={messagesEndRef}
                    />
                </div>

                <ChatInput
                    input={input}
                    setInput={setInput}
                    onSendMessage={handleSendMessage}
                    onFileSelect={handleFileSelect}
                    fileInputRef={fileInputRef}
                    selectedImages={selectedImages}
                    onRemoveImage={removeImage}
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
