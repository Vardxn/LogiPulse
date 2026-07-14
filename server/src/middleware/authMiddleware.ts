import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { JwtUserPayload } from "../types/express";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Access token is missing or malformed." });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "fallback_secret";

  try {
    const decoded = jwt.verify(token, secret) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: "Access token is invalid or expired." });
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "User context not authenticated." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Access denied. Action prohibited for this role." });
      return;
    }

    next();
  };
}
