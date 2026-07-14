import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser } from "../services/authService";
import { registerUserSchema, loginUserSchema } from "../schemas";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handleRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedBody = registerUserSchema.parse(req.body);
    
    const tenantExists = await prisma.tenant.findUnique({ where: { id: validatedBody.tenantId } });
    if (!tenantExists) {
      res.status(400).json({ success: false, error: "Referenced Tenant ID does not exist." });
      return;
    }

    const user = await registerUser(
      validatedBody.email,
      validatedBody.password,
      validatedBody.role,
      validatedBody.tenantId
    );
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedBody = loginUserSchema.parse(req.body);
    const token = await loginUser(validatedBody.email, validatedBody.password);

    const user = await prisma.user.findUnique({
      where: { email: validatedBody.email },
      select: { id: true, email: true, role: true },
    });

    res.status(200).json({ success: true, token, user });
  } catch (error) {
    next(error);
  }
}
