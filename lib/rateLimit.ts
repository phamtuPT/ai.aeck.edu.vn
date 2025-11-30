interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

/**
 * Simple in-memory rate limiter.
 * Note: In a serverless environment (like Vercel), this memory is not shared across instances.
 * For production, use Redis or a similar external store.
 * 
 * @param key Unique identifier (e.g., IP address or User ID)
 * @param limit Max requests allowed
 * @param windowMs Time window in milliseconds
 * @returns true if allowed, false if limit exceeded
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();

    if (!store[key]) {
        store[key] = {
            count: 1,
            resetTime: now + windowMs
        };
        return true;
    }

    const record = store[key];

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return true;
    }

    if (record.count < limit) {
        record.count++;
        return true;
    }

    return false;
}

// Cleanup old entries periodically (optional, to prevent memory leak in long-running process)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const key in store) {
            if (store[key].resetTime < now) {
                delete store[key];
            }
        }
    }, 60000); // Cleanup every minute
}
