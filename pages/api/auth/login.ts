import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise, { clientChatbotPromise } from '@/lib/mongodb';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username/Email và password là bắt buộc' });
    }

    try {
        // 1. Authenticate against aeckdb (Read-only)
        const client = await clientPromise;
        const db = client.db('aeckdb');
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({
            $or: [
                { username: username },
                { email: username }
            ],
            isActive: { $ne: false }
        });

        if (!user) {
            return res.status(401).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa' });
        }

        // Verify password
        let isPasswordValid = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isPasswordValid = bcrypt.compareSync(password, user.password);
        } else {
            isPasswordValid = user.password === password;
        }

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Mật khẩu không đúng' });
        }

        // 2. Create session in aeckdb_chatbot (Read-Write)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const clientChatbot = await clientChatbotPromise;
        const dbChatbot = clientChatbot.db('aeckdb_chatbot');
        const sessionsCollection = dbChatbot.collection('user_sessions');

        await sessionsCollection.insertOne({
            token,
            userId: user._id, // Keep original ID
            username: user.username || user.email,
            fullName: user.fullName || user.username || user.email,
            email: user.email || '',
            role: user.role || 'student',
            createdAt: new Date(),
            expiresAt,
            lastActivity: new Date(),
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });

        // Clean up expired sessions
        await sessionsCollection.deleteMany({
            expiresAt: { $lt: new Date() }
        });

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username || user.email,
                fullName: user.fullName || user.username || user.email,
                email: user.email || '',
                role: user.role || 'student'
            },
            expiresAt: expiresAt.toISOString()
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Lỗi hệ thống',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
