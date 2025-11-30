const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env.local:', result.error);
}

const uri = process.env.MONGODB_URI;
console.log('Loaded URI length:', uri ? uri.length : 'undefined');
if (uri) {
    // Mask password for safety in logs, but keep structure
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log('Loaded URI:', maskedUri);
    
    // Check for specific substring that might be causing issues
    if (uri.includes('160.250.130.69')) {
        console.log('URI contains correct IP: 160.250.130.69');
    } else {
        console.log('URI DOES NOT contain correct IP!');
    }
}

async function testConnection() {
    if (!uri) return;
    
    console.log('Attempting to connect...');
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB!');
        await client.close();
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

testConnection();
