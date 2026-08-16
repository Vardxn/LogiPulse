import { Router } from "express";
import { runRagEvaluation, askQuestion, verifyCitations } from "../controllers/ragController";

const router = Router();

// Endpoint to run regression tests on a golden dataset and store in DB
router.post("/eval", runRagEvaluation);

// Endpoint to ask a question against a document with citation enforcement
router.post("/ask", askQuestion);

// Endpoint to verify extracted citations against the database
router.post("/verify-citations", verifyCitations);

export default router;
