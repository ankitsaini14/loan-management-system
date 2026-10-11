import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "../errors.js";
import { ROLES, type Role } from "../models/User.js";

export type AuthUser = { id: string; role: Role; email: string; name: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next(new HttpError(401, "Login required"));
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    if (!ROLES.includes(payload.role)) return next(new HttpError(401, "Login required"));
    req.user = payload;
    next();
  } catch {
    next(new HttpError(401, "Session expired. Please log in again."));
  }
}

export function requireBorrower(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "borrower") return next(new HttpError(403, "Borrowers only"));
  next();
}

export function requireStaff(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return next(new HttpError(401, "Login required"));
    if (role === "admin" || roles.includes(role)) return next();
    next(new HttpError(403, "You do not have access to this module"));
  };
}
