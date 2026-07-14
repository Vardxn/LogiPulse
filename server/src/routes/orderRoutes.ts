import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { getOrders, createOrder, getOrderById, updateOrderStatus } from "../controllers/orderController";
import { handleCalculateOrderRoute } from "../controllers/routingController";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", authenticate, getOrders);
router.post("/", authenticate, authorize(Role.ADMIN, Role.LOGISTICS_PARTNER), createOrder);
router.post("/:orderId/route", authenticate, handleCalculateOrderRoute);
router.get("/:id", authenticate, getOrderById);
router.patch("/:id/status", authenticate, authorize(Role.ADMIN, Role.WAREHOUSE_OPERATOR), updateOrderStatus);

export default router;
