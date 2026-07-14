import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { logTelemetry, getTelemetry } from "../controllers/trackingController";
import { Role } from "@prisma/client";

const router = Router();

router.post("/:orderId", authenticate, authorize(Role.ADMIN, Role.LOGISTICS_PARTNER, Role.WAREHOUSE_OPERATOR), logTelemetry);
router.get("/:orderId", authenticate, getTelemetry);

export default router;
