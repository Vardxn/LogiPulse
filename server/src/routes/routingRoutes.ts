import { Router } from 'express';
import { handleCalculateOrderRoute } from '../controllers/routingController';
import { handleIngestBillOfLading } from '../controllers/bolController';

const router = Router();

// Route to calculate shortest path for an order
router.post('/orders/:orderId/route', handleCalculateOrderRoute);

// Route to ingest Bill of Lading documents
router.post('/bill-of-lading/ingest', handleIngestBillOfLading);

export default router;
