import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { getVendors, createVendor, getVendorById } from "../controllers/vendorController";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", authenticate, getVendors);
router.post("/", authenticate, authorize(Role.ADMIN, Role.LOGISTICS_PARTNER), createVendor);
router.get("/:id", authenticate, getVendorById);

export default router;
