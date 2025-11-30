import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'sonner';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // Unregister existing service workers to debug 405 error
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker unregistered');
                }
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
