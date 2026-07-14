import { registerUser, loginUser } from "../services/authService";
import { authorize, authenticate } from "../middleware/authMiddleware";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

jest.mock("@prisma/client", () => {
  const mPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    }
  };
  return { PrismaClient: jest.fn(() => mPrisma), Role: { ADMIN: "ADMIN", LOGISTICS_PARTNER: "LOGISTICS_PARTNER", WAREHOUSE_OPERATOR: "WAREHOUSE_OPERATOR" } };
});

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const prisma = new PrismaClient();

describe("Auth System Tests Layer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("registerUser should cleanly execute password hashing strategies instead of raw ingestion", async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue("mocked_hashed_password");
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: "u-1",
      email: "test@logipulse.com",
      passwordHash: "mocked_hashed_password",
      role: Role.ADMIN,
      tenantId: "t-1",
    });

    const result = await registerUser("test@logipulse.com", "plain_password123", Role.ADMIN, "t-1");
    
    expect(bcrypt.hash).toHaveBeenCalledWith("plain_password123", 10);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty("passwordHash");
  });

  test("loginUser must throw explicit functional error models if decryption validations fail", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u-1",
      email: "test@logipulse.com",
      passwordHash: "hashed_pass",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(loginUser("test@logipulse.com", "wrong_pass")).rejects.toThrow("Invalid email or password.");
  });

  test("loginUser produces valid JWT payload responses under accurate profile authentication triggers", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u-1",
      email: "test@logipulse.com",
      passwordHash: "hashed_pass",
      role: Role.ADMIN,
      tenantId: "t-1",
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue("mocked_token_string");

    const token = await loginUser("test@logipulse.com", "correct_pass");
    expect(token).toBe("mocked_token_string");
  });

  test("authorize middleware invokes next execution step only when matching credentials criteria align", () => {
    const middleware = authorize(Role.ADMIN);
    const mockReq = { user: { role: Role.ADMIN } } as unknown as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  test("authorize middleware actively rejects and issues 403 blocks when credentials misalign", () => {
    const middleware = authorize(Role.ADMIN);
    const mockReq = { user: { role: Role.WAREHOUSE_OPERATOR } } as unknown as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    middleware(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("authenticate middleware interceptor blocks unauthenticated access dropping a 401 when no signature is found", () => {
    const mockReq = { headers: {} } as unknown as Request;
    const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const mockNext = jest.fn() as NextFunction;

    authenticate(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
