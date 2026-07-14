import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { getInventory, createInventoryItem, updateInventoryQuantity } from "../controllers/inventoryController";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", authenticate, getInventory);
router.post("/", authenticate, authorize(Role.ADMIN, Role.WAREHOUSE_OPERATOR), createInventoryItem);
router.patch("/:id/quantity", authenticate, authorize(Role.ADMIN, Role.WAREHOUSE_OPERATOR), updateInventoryQuantity);

export default router;
