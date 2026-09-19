import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";

const prisma = getPrisma();

const COOKIE_NAME = "toktickit_session";
const SESSION_MS = 8 * 60 * 60 * 1000;
const ROUNDS = 12;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const allowedOrigins = (
  process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthUser;
  }
}

function fail(
  res: Response,
  status: number,
  code: string,
  message: string
) {
  return res.status(status).json({
    error: { code, message },
  });
}

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function readToken(req: Request): string | null {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  const token = cookie?.slice(COOKIE_NAME.length + 1);

  return token && /^[a-f0-9]{64}$/.test(token)
    ? token
    : null;
}

function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api",
  });
}

async function createSession(
  userId: number,
  res: Response
) {
  const token = randomBytes(32).toString("hex");

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api",
    maxAge: SESSION_MS,
  });
}

function validatePassword(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Password is required.";
  }

  if (
    value.length < 8 ||
    Buffer.byteLength(value, "utf8") > 72
  ) {
    return "Password must contain at least 8 characters and at most 72 UTF-8 bytes.";
  }

  if (
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return "Password must contain uppercase, lowercase, number and symbol.";
  }

  return null;
}

// ==================================================
// ORIGIN PROTECTION
// ==================================================

export function verifyRequestOrigin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.header("origin");
  const fetchSite = req.header("sec-fetch-site");

  if (
    (origin && !allowedOrigins.includes(origin)) ||
    (fetchSite === "cross-site" &&
      (!origin || !allowedOrigins.includes(origin)))
  ) {
    return fail(
      res,
      403,
      "INVALID_ORIGIN",
      "Request origin is not allowed."
    );
  }

  return next();
}

// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = readToken(req);

    if (!token) {
      return fail(
        res,
        401,
        "UNAUTHENTICATED",
        "Sign in is required."
      );
    }

    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashToken(token),
      },
      select: {
        userId: true,
        expiresAt: true,
      },
    });

    if (
      !session ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      clearSessionCookie(res);

      return fail(
        res,
        401,
        "UNAUTHENTICATED",
        "Session expired. Sign in again."
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!user || !user.isActive) {
      await prisma.session.deleteMany({
        where: {
          tokenHash: hashToken(token),
        },
      });

      clearSessionCookie(res);

      return fail(
        res,
        401,
        "UNAUTHENTICATED",
        "Session is no longer valid."
      );
    }

    req.authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return next();
  } catch (error) {
    console.error("Authentication error:", error);

    return fail(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to verify session."
    );
  }
}

export function requireCompletedPasswordChange(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.authUser?.mustChangePassword) {
    return fail(
      res,
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Change your initial password first."
    );
  }

  return next();
}

// ==================================================
// AUTH ROUTES
// ==================================================

export const authRouter = Router();

const attempts = new Map<
  string,
  { count: number; until: number }
>();

const dummyHash = bcrypt.hashSync(
  "NotARealUserPassword!123",
  ROUNDS
);

// ==================================================
// LOGIN
// POST /api/auth/login
// ==================================================

authRouter.post("/login", async (req, res) => {
  const body = req.body as {
    email?: unknown;
    password?: unknown;
  } | undefined;

  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password = body?.password;

  if (
    !email ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > 1024
  ) {
    return fail(
      res,
      400,
      "VALIDATION_ERROR",
      "Enter a valid email and password."
    );
  }

  const key = `${req.ip ?? "unknown"}:${email}`;
  const previous = attempts.get(key);

  if (
    previous &&
    previous.count >= 5 &&
    previous.until > Date.now()
  ) {
    return fail(
      res,
      429,
      "TOO_MANY_ATTEMPTS",
      "Too many attempts. Try again later."
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const valid = await bcrypt.compare(
      password,
      user?.passwordHash || dummyHash
    );

    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !valid
    ) {
      const count =
        previous && previous.until > Date.now()
          ? previous.count
          : 0;

      attempts.set(key, {
        count: count + 1,
        until: Date.now() + 15 * 60 * 1000,
      });

      return fail(
        res,
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password."
      );
    }

    attempts.delete(key);

    await createSession(user.id, res);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      requiresPasswordChange: user.mustChangePassword,
    });
  } catch (error) {
    console.error("Login error:", error);

    return fail(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to sign in."
    );
  }
});

// ==================================================
// CURRENT USER
// GET /api/auth/me
// ==================================================

authRouter.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: req.authUser,
  });
});

// ==================================================
// LOGOUT
// POST /api/auth/logout
// ==================================================

authRouter.post("/logout", async (req, res) => {
  try {
    const token = readToken(req);

    if (token) {
      await prisma.session.deleteMany({
        where: {
          tokenHash: hashToken(token),
        },
      });
    }

    clearSessionCookie(res);

    return res.status(200).json({
  message: "Logged out successfully.",
});
  } catch (error) {
    console.error("Logout error:", error);

    return fail(
      res,
      500,
      "INTERNAL_ERROR",
      "Unable to sign out."
    );
  }
});

// ==================================================
// CHANGE PASSWORD
// POST /api/auth/change-password
// ==================================================

authRouter.post(
  "/change-password",
  requireAuth,
  async (req, res) => {
    const body = req.body as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    } | undefined;

    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (
      typeof currentPassword !== "string" ||
      !currentPassword
    ) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "Current password is required."
      );
    }

    const passwordProblem =
      validatePassword(newPassword);

    if (passwordProblem) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        passwordProblem
      );
    }

    if (newPassword !== body?.confirmPassword) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "New passwords do not match."
      );
    }

    try {
      const userId = req.authUser!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
        },
      });

      if (
        !user?.passwordHash ||
        !(await bcrypt.compare(
          currentPassword,
          user.passwordHash
        ))
      ) {
        return fail(
          res,
          400,
          "INVALID_PASSWORD",
          "Current password is incorrect."
        );
      }

      if (
        await bcrypt.compare(
          newPassword as string,
          user.passwordHash
        )
      ) {
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          "Choose a different password."
        );
      }

      const passwordHash = await bcrypt.hash(
        newPassword as string,
        ROUNDS
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });

      // Revoke all previous sessions.
      await prisma.session.deleteMany({
        where: { userId },
      });

      clearSessionCookie(res);

      return res.status(200).json({
  message:
    "Password changed. Please sign in again.",
  mustChangePassword: false,
});
    } catch (error) {
      console.error("Password change error:", error);

      return fail(
        res,
        500,
        "INTERNAL_ERROR",
        "Unable to change password."
      );
    }
  }
);