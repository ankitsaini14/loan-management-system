import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "./config.js";

let memory: MongoMemoryServer | null = null;

export async function connectDb() {
  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB");
    return;
  }
  memory = await MongoMemoryServer.create({ instance: { dbName: "lms" } });
  await mongoose.connect(memory.getUri());
  console.log("Started an embedded MongoDB. Set MONGODB_URI to use your own database.");
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memory) await memory.stop();
}
