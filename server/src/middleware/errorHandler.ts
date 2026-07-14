import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Application Error Log]: ${err.message || err}`);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Data validation constraints violated.",
      details: err.errors.map(e => ({ field: e.path.join("."), issue: e.message }))
    });
    return;
  }

  if (err.message && (err.message.includes("Invalid email") || err.message.includes("Access denied"))) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  res.status(500).json({
    success: false,
    error: err.message || "A fatal unexpected server fault occurred.",
    ...(isProduction ? {} : { stack: err.stack })
  });
}
