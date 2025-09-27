import { MongoClient, Db } from 'mongodb';
import { ENV } from '../config/env.js';

let db: Db;
let client: MongoClient;

export async function connectToDatabase() {
  if (db) {
    return db;
  }

  client = new MongoClient(ENV.MONGO_URI);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase first.');
  }
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}
