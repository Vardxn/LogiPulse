import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { createInventoryItemSchema, updateInventoryQuantitySchema } from "../schemas";

const prisma = new PrismaClient();

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { warehouseId, lowStock } = req.query;

    const whereClause: any = {
      warehouse: {
        tenantId
      }
    };

    if (warehouseId) {
      whereClause.warehouseId = warehouseId as string;
    }

    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
    });

    let filteredItems = items;
    if (lowStock === "true") {
      filteredItems = items.filter((item) => item.quantity <= item.reorderThreshold);
    }

    res.status(200).json({ success: true, data: filteredItems });
  } catch (error) {
    next(error);
  }
}

export async function createInventoryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const validatedBody = createInventoryItemSchema.parse(req.body);

    const warehouseExists = await prisma.warehouse.findUnique({
      where: { id: validatedBody.warehouseId },
    });

    if (!warehouseExists || warehouseExists.tenantId !== tenantId) {
      res.status(400).json({ success: false, error: "Target warehouse invalid or unavailable." });
      return;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        ...validatedBody,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const validatedBody = updateInventoryQuantitySchema.parse(req.body);

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        warehouse: {
          tenantId
        }
      }
    });
    if (!item) {
      res.status(404).json({ success: false, error: "Inventory resource not found." });
      return;
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: validatedBody.quantity },
    });

    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    next(error);
  }
}
