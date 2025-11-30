import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

if (!process.env.MONGODB_URI_CHATBOT) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI_CHATBOT"');
}

const uri = process.env.MONGODB_URI;
const uriChatbot = process.env.MONGODB_URI_CHATBOT;

if (uri) {
    console.error('ANTIGRAVITY_DEBUG: MONGODB_URI length:', uri.length);
    // Mask password but show IP part
    console.error('ANTIGRAVITY_DEBUG: MONGODB_URI masked:', uri.replace(/:([^:@]+)@/, ':****@'));
} else {
    console.error('ANTIGRAVITY_DEBUG: MONGODB_URI is undefined');
}

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

let clientChatbot: MongoClient;
let clientChatbotPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the connection across module reloads
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
        _mongoClientChatbotPromise?: Promise<MongoClient>;
    };

    // Read-only connection (aeckdb)
    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;

    // Read-write connection (aeckdb_chatbot)
    if (!globalWithMongo._mongoClientChatbotPromise) {
        clientChatbot = new MongoClient(uriChatbot, options);
        globalWithMongo._mongoClientChatbotPromise = clientChatbot.connect();
    }
    clientChatbotPromise = globalWithMongo._mongoClientChatbotPromise;
} else {
    // In production mode, create a new client for each request
    client = new MongoClient(uri, options);
    clientPromise = client.connect();

    clientChatbot = new MongoClient(uriChatbot, options);
    clientChatbotPromise = clientChatbot.connect();
}

export default clientPromise;
export { clientChatbotPromise };
