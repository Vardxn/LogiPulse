import { Role } from "@prisma/client";

export interface JwtUserPayload {
  userId: string;
  role: Role;
  tenantId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
