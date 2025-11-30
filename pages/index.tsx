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
        <div className="min-h-screen bg-[#131314] flex items-center justify-center p-4 font-sans text-[#e3e3e3]">
            <Head>
                <title>Đăng nhập - Trợ giảng AI</title>
            </Head>

            <div className="w-full max-w-md bg-[#1e1f20] rounded-2xl border border-[#444746] p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-semibold text-white">Đăng nhập</h1>
                    <p className="text-[#c4c7c5] mt-2 text-sm">Sử dụng tài khoản AECK của bạn</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#c4c7c5] mb-2">Tên đăng nhập hoặc Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#131314] border border-[#444746] rounded-lg px-4 py-3 text-[#e3e3e3] focus:border-[#7cacf8] focus:ring-1 focus:ring-[#7cacf8] outline-none transition-all placeholder-[#444746]"
                            placeholder="Nhập tên đăng nhập..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#c4c7c5] mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#131314] border border-[#444746] rounded-lg px-4 py-3 text-[#e3e3e3] focus:border-[#7cacf8] focus:ring-1 focus:ring-[#7cacf8] outline-none transition-all placeholder-[#444746]"
                            placeholder="Nhập mật khẩu..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium py-3 rounded-full transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Đang xử lý...
                            </>
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
