import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Commencing dynamic system cross-database seed configurations...");

  // Cleanup existing Postgres records to ensure idempotency without database wipes
  console.log("Cleaning up existing PostgreSQL database tables...");
  await prisma.shipmentRoute.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 1. Establish core relational topology boundaries in Postgres
  const tenant = await prisma.tenant.create({
    data: { name: "Global Logistics Enterprise Corp" }
  });

  const warehouseMumbai = await prisma.warehouse.create({
    data: { id: "a2b0d778-d567-4a0b-8514-99881a174001", name: "Mumbai Port Hub", latitude: 19.0760, longitude: 72.8777, tenantId: tenant.id, capacityUnits: 1000 }
  });

  const warehouseDelhi = await prisma.warehouse.create({
    data: { id: "b6d0e889-e678-5b0c-9615-aa992b275002", name: "Delhi Container Depot", latitude: 28.6139, longitude: 77.2090, tenantId: tenant.id, capacityUnits: 2000 }
  });

  const vendor = await prisma.vendor.create({
    data: { name: "Nexus Freight Carriers", contactEmail: "contact@nexusfreight.com", tenantId: tenant.id }
  });

  const order = await prisma.order.create({
    data: {
      id: "c3a0d999-e789-6c0d-0716-bb003c376003",
      tenantId: tenant.id,
      vendorId: vendor.id,
      originWarehouseId: warehouseMumbai.id,
      destinationWarehouseId: warehouseDelhi.id,
      status: "PENDING",
      totalCost: 1500.00
    }
  });

  console.log(`✅ Postgres Data successfully populated. Order Target: ${order.id}`);

  // 2. Hydrate dynamic telemetric feed context tracking in MongoDB
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/logipulse";
  await mongoose.connect(MONGO_URI);

  // Clear existing logs to prevent cluttering tests
  await mongoose.connection.collection("route_condition_feeds").deleteMany({});

  await mongoose.connection.collection("route_condition_feeds").insertMany([
    {
      nodeId: warehouseMumbai.id,
      timestamp: new Date(),
      congestionScore: 0.75, // Severe port delays
      weatherPenalty: 0.20,
      fuelCostIndex: 1.15
    },
    {
      nodeId: warehouseDelhi.id,
      timestamp: new Date(),
      congestionScore: 0.15,
      weatherPenalty: 0.80, // Heavy seasonal disruptions
      fuelCostIndex: 1.05
    }
  ]);

  console.log("✅ MongoDB Telemetry Feeds seeded successfully.");
  await mongoose.disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Seeding execution failure:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
