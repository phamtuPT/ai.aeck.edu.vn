import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'sonner';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // App không còn dùng service worker; gỡ bản cũ còn sót trên máy người dùng
            // (bản cũ từng chặn request POST và gây lỗi 405).
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => registration.unregister());
            });
        }
    }, []);

    return (
        <>
            <Component {...pageProps} />
            <Toaster position="top-right" richColors />
        </>
    );
}
