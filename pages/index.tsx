import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('chatbot_token', data.token);
                localStorage.setItem('chatbot_user', JSON.stringify(data.user));
                router.push('/chat');
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white selection:bg-white/20 relative overflow-hidden">
            <Head>
                <title>Đăng nhập - Trợ giảng AI</title>
            </Head>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[150px]"></div>
            </div>

            <div className="w-full max-w-md bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 shadow-lg">
                        <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain opacity-90" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Chào mừng trở lại</h1>
                    <p className="text-gray-400 text-sm">Đăng nhập để tiếp tục với Trợ giảng AI</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Tên đăng nhập</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all placeholder-gray-600"
                                placeholder="Nhập tên đăng nhập..."
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Mật khẩu</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all placeholder-gray-600"
                                placeholder="Nhập mật khẩu..."
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all transform hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="text-sm">Đang xử lý...</span>
                            </>
                        ) : (
                            <span className="text-sm">Đăng nhập</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
