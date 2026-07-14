import { z } from "zod";
import { Role, OrderStatus } from "@prisma/client";

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  role: z.nativeEnum(Role),
  tenantId: z.string().uuid("Tenant ID must be a valid UUID."),
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
});

export const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required."),
  contactEmail: z.string().email("Invalid contact email format."),
  tariffDefaultCode: z.string().optional(),
});

export const createOrderSchema = z.object({
  vendorId: z.string().uuid("Invalid Vendor ID format."),
  originWarehouseId: z.string().uuid("Invalid Origin Warehouse ID format."),
  destinationWarehouseId: z.string().uuid("Invalid Destination Warehouse ID format."),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING).optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid("Invalid Item ID format."),
        quantity: z.number().int().positive("Quantity must be a positive integer."),
      })
    )
    .min(1, "Order must contain at least 1 item."),
});

export const createInventoryItemSchema = z.object({
  warehouseId: z.string().uuid("Invalid Warehouse ID format."),
  sku: z.string().min(1, "SKU code is required."),
  name: z.string().min(1, "Item name is required."),
  quantity: z.number().int().nonnegative("Quantity cannot be negative."),
  reorderThreshold: z.number().int().nonnegative("Reorder threshold cannot be negative."),
});

export const updateInventoryQuantitySchema = z.object({
  quantity: z.number().int().nonnegative("Quantity cannot be negative."),
});

export const createTelemetrySchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  transportMode: z.enum(["SEA", "RAIL", "ROAD"]),
  speedKmh: z.number().nonnegative(),
  eventType: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});
