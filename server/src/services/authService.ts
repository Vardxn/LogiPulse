import { PrismaClient, User, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../types/express";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export type OmittedUser = Omit<User, "passwordHash">;

export async function registerUser(
  email: string,
  password: string,
  role: Role,
  tenantId: string
): Promise<OmittedUser> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      tenantId,
    },
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function loginUser(
  email: string,
  password: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  const payload: JwtUserPayload = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
  };

  const secret = process.env.JWT_SECRET || "fallback_secret";
  return jwt.sign(payload, secret, { expiresIn: "8h" });
}
