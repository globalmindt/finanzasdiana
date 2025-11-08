import { MongoClient, Db, type Document } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB as string;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!dbName) throw new Error('MONGODB_DB is not set');

  if (db) return db;

  if (!client) {
    client = new MongoClient(uri, {
      // TLS enabled by default in Atlas; options can be extended if needed
    });
  }
  await client.connect();
  db = client.db(dbName);
  return db;
}

export async function getCollection<T extends Document = any>(name: string) {
  const database = await getDb();
  return database.collection<T>(name);
}