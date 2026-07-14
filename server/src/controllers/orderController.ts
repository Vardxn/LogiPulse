import { Request, Response, NextFunction } from "express";
import { PrismaClient, OrderStatus } from "@prisma/client";
import { createOrderSchema } from "../schemas";
import { z } from "zod";

const prisma = new PrismaClient();

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { status } = req.query;

    const whereClause: any = { tenantId };
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      whereClause.status = status as OrderStatus;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { orderItems: true },
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const validatedBody = createOrderSchema.parse(req.body);

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          vendorId: validatedBody.vendorId,
          originWarehouseId: validatedBody.originWarehouseId,
          destinationWarehouseId: validatedBody.destinationWarehouseId,
          status: validatedBody.status || OrderStatus.PENDING,
          tenantId,
          totalCost: 0 // Placeholder base total cost updated when calculated
        },
      });

      const orderItemsData = validatedBody.items.map((item) => ({
        orderId: order.id,
        itemId: item.itemId,
        quantity: item.quantity,
      }));

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { orderItems: true },
      });
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!order || order.tenantId !== tenantId) {
      res.status(404).json({ success: false, error: "Order resource not found." });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    const statusSchema = z.object({ status: z.nativeEnum(OrderStatus) });
    const { status } = statusSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.tenantId !== tenantId) {
      res.status(404).json({ success: false, error: "Order resource not found." });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
}
