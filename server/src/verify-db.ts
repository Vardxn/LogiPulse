import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const routes = await prisma.shipmentRoute.findMany({});
  console.log("=== postgres: ShipmentRoute Table ===");
  console.log(JSON.stringify(routes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
