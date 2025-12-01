import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Handle CORS for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Handle preflight OPTIONS request
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-api-key',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // For actual requests, add CORS headers to the response
        const response = NextResponse.next();
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-api-key');

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
