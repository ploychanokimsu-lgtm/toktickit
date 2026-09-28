import bcrypt from "bcrypt";
import {
  Prisma,
  UserRole,
} from "@prisma/client";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import {
  requireAuth,
  requireCompletedPasswordChange,
} from "./auth.js";
import { getPrisma } from "./prisma.js";

const prisma = getPrisma();
const PASSWORD_ROUNDS = 12;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} satisfies Prisma.UserSelect;

const ALLOWED_ROLES = Object.values(UserRole);

export const adminUsersRouter = Router();

function errorResponse(
  res: Response,
  status: number,
  error: string,
  message: string
) {
  return res.status(status).json({
    error,
    message,
  });
}

function requireAdministrator(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (
    req.authUser?.role !==
    UserRole.ADMINISTRATOR
  ) {
    return errorResponse(
      res,
      403,
      "FORBIDDEN",
      "You do not have permission to perform this operation."
    );
  }

  return next();
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readUserId(
  value: string
): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number)
    ? number
    : null;
}

function validateName(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();
  const length = [...name].length;

  if (length < 1 || length > 100) {
    return null;
  }

  return name;
}

function validateEmail(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email =
    value.trim().toLowerCase();

  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    return null;
  }

  return email;
}

function validateRole(
  value: unknown
): UserRole | null {
  if (
    typeof value !== "string" ||
    !ALLOWED_ROLES.includes(
      value as UserRole
    )
  ) {
    return null;
  }

  return value as UserRole;
}

function validatePassword(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  if (
    value.length < 8 ||
    Buffer.byteLength(value, "utf8") > 72
  ) {
    return null;
  }

  if (
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return null;
  }

  return value;
}

function isDuplicateError(
  error: unknown
) {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function duplicateEmailExists(
  email: string,
  excludedUserId?: number
) {
  const duplicate =
    await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
        ...(excludedUserId
          ? {
              id: {
                not: excludedUserId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

  return duplicate !== null;
}

adminUsersRouter.use(
  requireAuth,
  requireCompletedPasswordChange,
  requireAdministrator
);

// ============================================================
// LIST USERS
// GET /api/admin/users
// ============================================================

adminUsersRouter.get(
  "/",
  async (req, res) => {
    const searchValue =
      req.query.search;

    const roleValue =
      req.query.role;

    if (
      searchValue !== undefined &&
      typeof searchValue !== "string"
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Search must be a single value."
      );
    }

    const search =
      typeof searchValue === "string"
        ? searchValue.trim()
        : "";

    if (search.length > 100) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Search must contain at most 100 characters."
      );
    }

    let role: UserRole | undefined;

    if (roleValue !== undefined) {
      role = validateRole(roleValue) ?? undefined;

      if (!role) {
        return errorResponse(
          res,
          400,
          "INVALID_ROLE",
          "The selected role is not valid."
        );
      }
    }

    const where:
      Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
    };

    try {
      const items =
        await prisma.user.findMany({
          where,
          select: USER_SELECT,
          orderBy: [
            {
              name: "asc",
            },
            {
              email: "asc",
            },
          ],
        });

      return res.status(200).json({
        items,
      });
    } catch (error) {
      console.error(
        "List users error:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "Unable to retrieve users."
      );
    }
  }
);

// ============================================================
// CREATE USER
// POST /api/admin/users
// ============================================================

adminUsersRouter.post(
  "/",
  async (req, res) => {
    if (!isRecord(req.body)) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "A valid request body is required."
      );
    }

    const name =
      validateName(req.body.name);

    if (!name) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Name is required and must contain at most 100 characters."
      );
    }

    const email =
      validateEmail(req.body.email);

    if (!email) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Enter a valid email address containing at most 254 characters."
      );
    }

    const role =
      validateRole(req.body.role);

    if (!role) {
      return errorResponse(
        res,
        400,
        "INVALID_ROLE",
        "The selected role is not valid."
      );
    }

    if (
      typeof req.body.isActive !==
      "boolean"
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Activation state is required."
      );
    }

    const initialPassword =
      validatePassword(
        req.body.initialPassword
      );

    if (!initialPassword) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Password must contain 8–72 UTF-8 bytes, including uppercase, lowercase, number and symbol."
      );
    }

    try {
      if (
        await duplicateEmailExists(
          email
        )
      ) {
        return errorResponse(
          res,
          409,
          "DUPLICATE_EMAIL",
          "A user with this email address already exists."
        );
      }

      const passwordHash =
        await bcrypt.hash(
          initialPassword,
          PASSWORD_ROUNDS
        );

      const user =
        await prisma.user.create({
          data: {
            name,
            email,
            role,
            isActive:
              req.body.isActive,
            passwordHash,
            mustChangePassword: true,
          },
          select: USER_SELECT,
        });

      return res.status(201).json({
        user,
      });
    } catch (error) {
      if (isDuplicateError(error)) {
        return errorResponse(
          res,
          409,
          "DUPLICATE_EMAIL",
          "A user with this email address already exists."
        );
      }

      console.error(
        "Create user error:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "Unable to create the user."
      );
    }
  }
);

// ============================================================
// UPDATE USER
// PATCH /api/admin/users/:userId
// ============================================================

adminUsersRouter.patch(
  "/:userId",
  async (req, res) => {
    const userId =
      readUserId(req.params.userId);

    if (!userId) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "User ID must be a positive integer."
      );
    }

    if (!isRecord(req.body)) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "A valid request body is required."
      );
    }

    const allowedFields =
      new Set([
        "name",
        "email",
        "role",
        "isActive",
      ]);

    const suppliedFields =
      Object.keys(req.body);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some(
        (field) =>
          !allowedFields.has(field)
      )
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Provide at least one editable user field."
      );
    }

    const data: {
      name?: string;
      email?: string;
      role?: UserRole;
      isActive?: boolean;
    } = {};

    if ("name" in req.body) {
      const name =
        validateName(req.body.name);

      if (!name) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Name is required and must contain at most 100 characters."
        );
      }

      data.name = name;
    }

    if ("email" in req.body) {
      const email =
        validateEmail(req.body.email);

      if (!email) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Enter a valid email address containing at most 254 characters."
        );
      }

      data.email = email;
    }

    if ("role" in req.body) {
      const role =
        validateRole(req.body.role);

      if (!role) {
        return errorResponse(
          res,
          400,
          "INVALID_ROLE",
          "The selected role is not valid."
        );
      }

      data.role = role;
    }

    if ("isActive" in req.body) {
      if (
        typeof req.body.isActive !==
        "boolean"
      ) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Activation state must be true or false."
        );
      }

      data.isActive =
        req.body.isActive;
    }

    try {
      const current =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        });

      if (!current) {
        return errorResponse(
          res,
          404,
          "NOT_FOUND",
          "User not found."
        );
      }

      if (
        current.id ===
          req.authUser!.id &&
        data.isActive === false
      ) {
        return errorResponse(
          res,
          409,
          "SELF_DEACTIVATION_NOT_ALLOWED",
          "You cannot deactivate your own account."
        );
      }

      const removesActiveAdministrator =
        current.role ===
          UserRole.ADMINISTRATOR &&
        current.isActive &&
        (
          data.isActive === false ||
          (
            data.role !== undefined &&
            data.role !==
              UserRole.ADMINISTRATOR
          )
        );

      if (
        removesActiveAdministrator
      ) {
        const activeAdministratorCount =
          await prisma.user.count({
            where: {
              role:
                UserRole.ADMINISTRATOR,
              isActive: true,
            },
          });

        if (
          activeAdministratorCount <= 1
        ) {
          return errorResponse(
            res,
            409,
            "LAST_ADMIN_REQUIRED",
            "At least one active Administrator must remain."
          );
        }
      }

      if (
        data.email &&
        await duplicateEmailExists(
          data.email,
          userId
        )
      ) {
        return errorResponse(
          res,
          409,
          "DUPLICATE_EMAIL",
          "A user with this email address already exists."
        );
      }

      const user =
        await prisma.user.update({
          where: {
            id: userId,
          },
          data,
          select: USER_SELECT,
        });

      if (data.isActive === false) {
        await prisma.session.deleteMany({
          where: {
            userId,
          },
        });
      }

      return res.status(200).json({
        user,
      });
    } catch (error) {
      if (isDuplicateError(error)) {
        return errorResponse(
          res,
          409,
          "DUPLICATE_EMAIL",
          "A user with this email address already exists."
        );
      }

      console.error(
        "Update user error:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "Unable to update the user."
      );
    }
  }
);

// ============================================================
// SET INITIAL PASSWORD
// POST /api/admin/users/:userId/initial-password
// ============================================================

adminUsersRouter.post(
  "/:userId/initial-password",
  async (req, res) => {
    const userId =
      readUserId(req.params.userId);

    if (!userId) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "User ID must be a positive integer."
      );
    }

    if (!isRecord(req.body)) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "A valid request body is required."
      );
    }

    const initialPassword =
      validatePassword(
        req.body.initialPassword
      );

    if (!initialPassword) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Password must contain 8–72 UTF-8 bytes, including uppercase, lowercase, number and symbol."
      );
    }

    try {
      const existing =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
          },
        });

      if (!existing) {
        return errorResponse(
          res,
          404,
          "NOT_FOUND",
          "User not found."
        );
      }

      const passwordHash =
        await bcrypt.hash(
          initialPassword,
          PASSWORD_ROUNDS
        );

      await prisma.$transaction([
        prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            passwordHash,
            mustChangePassword: true,
          },
        }),
        prisma.session.deleteMany({
          where: {
            userId,
          },
        }),
      ]);

      return res.status(200).json({
        message:
          "New initial password set successfully.",
        mustChangePassword: true,
      });
    } catch (error) {
      console.error(
        "Set initial password error:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "Unable to set the new initial password."
      );
    }
  }
);
