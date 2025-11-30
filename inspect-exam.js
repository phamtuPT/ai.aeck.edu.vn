const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const uri = process.env.MONGODB_URI;

async function inspectExam() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('aeckdb');
        const exam = await db.collection('exams').findOne({});
        console.log('Exam Sample:', JSON.stringify(exam, null, 2));

        const count = await db.collection('exams').countDocuments();
        console.log('Total Exams:', count);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

inspectExam();
