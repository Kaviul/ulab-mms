import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
declare global {
  var mongooseCache: MongooseCache | undefined;
}

//let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

let cached = global.mongooseCache || {
  conn: null,
  promise: null,
}

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

 
export default async function dbConnect() {
  if (cached.conn) {
   // return cached.conn;
   return {
    mongoose: cached.conn,
    db: cached.conn.connection.db,
   }
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

 // return cached.conn;

 return{
  mongoose: cached.conn,
  db: cached.conn.connection.db,
 }
}

//export default dbConnect;
