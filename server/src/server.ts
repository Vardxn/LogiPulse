import app from "./app";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { connectMongo } from "./db/mongoConnect";

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

async function startServer() {
  console.log("Connecting to databases...");
  try {
    // 1. Connect MongoDB
    await connectMongo();

    // 2. Connect PostgreSQL via Prisma
    await prisma.$connect();
    console.log("PostgreSQL successfully connected via Prisma.");

    // 3. Express server starts listening after databases connect
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize database connections:", error);
    process.exit(1);
  }
}

startServer();
