import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/**
 * Creates a Prisma Client extension that automatically enforces tenant isolation.
 * Any query made using this extended client will automatically inject `tenantId` into the WHERE clause.
 */
export const getTenantPrisma = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Check if the model has a tenantId field by inspecting args
          // In a strict setup, we explicitly check model names.
          const tenantModels = ["User", "Warehouse", "Vendor", "Order"];
          
          if (tenantModels.includes(model)) {
            if (operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany' || operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
              args.where = { ...args.where, tenantId };
            } else if (operation === 'create' || operation === 'createMany') {
              // For create operations, ensure tenantId is injected into the data payload
              if (Array.isArray((args as any).data)) {
                (args as any).data = (args as any).data.map((d: any) => ({ ...d, tenantId }));
              } else {
                (args as any).data = { ...(args as any).data, tenantId };
              }
            }
          }
          return query(args);
        },
      },
    },
  });
};
