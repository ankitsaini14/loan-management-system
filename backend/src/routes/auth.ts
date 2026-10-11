import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { asyncHandler } from "../middleware/async.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { User } from "../models/User.js";

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const authRouter = Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const body = credentials
      .extend({ name: z.string().trim().min(2, "Name must be at least 2 characters") })
      .parse(req.body);
    const existing = await User.findOne({ email: body.email });
    if (existing) throw new HttpError(409, "An account with this email already exists");
    const user = await User.create({
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: "borrower",
    });
    const authUser = { id: String(user._id), role: user.role, email: user.email, name: user.name };
    res.status(201).json({ ok: true, data: { token: signToken(authUser), user: authUser } });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = credentials.parse(req.body);
    const user = await User.findOne({ email: body.email });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, "Email or password is incorrect");
    }
    const authUser = { id: String(user._id), role: user.role, email: user.email, name: user.name };
    res.json({ ok: true, data: { token: signToken(authUser), user: authUser } });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: req.user });
  }),
);
