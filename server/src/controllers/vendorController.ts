import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { createVendorSchema } from "../schemas";

const prisma = new PrismaClient();

export async function getVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const vendors = await prisma.vendor.findMany({
      where: { tenantId },
    });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    next(error);
  }
}

export async function createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const validatedBody = createVendorSchema.parse(req.body);

    const vendor = await prisma.vendor.create({
      data: {
        ...validatedBody,
        tenantId,
      },
    });
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
}

export async function getVendorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor || vendor.tenantId !== tenantId) {
      res.status(404).json({ success: false, error: "Vendor resource not found." });
      return;
    }

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
}
