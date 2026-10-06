import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, LOCALES } from "../models/User";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  surname: z.string().trim().min(1),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD")
    .transform((valor) => new Date(valor))
    .refine(
      (fecha) =>
        !Number.isNaN(fecha.getTime()) &&
        fecha.getUTCFullYear() >= 1900 &&
        fecha < new Date(),
      "Fecha de nacimiento no válida"
    ),
  locale: z.enum(LOCALES).optional(),
  password: z.string().min(8).max(72),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, name, surname, birthDate, locale, password } = parsed.data;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, name, surname, birthDate, locale, passwordHash });

  return res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    birthDate: user.birthDate,
    age: user.age,
    locale: user.locale,
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos no válidos" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Falta la variable JWT_SECRET");
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  // Mismo mensaje si falla el email o la contraseña, para no revelar qué cuentas existen
  const valido = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valido) {
    return res.status(401).json({ error: "Email o contraseña incorrectos" });
  }

  const token = jwt.sign({}, secret, { subject: user.id, expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    locale: user.locale,
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  return res.status(204).send();
});

router.get("/me", requireAuth, async (_req, res) => {
  const user = await User.findById(res.locals.userId);
  if (!user) {
    return res.status(401).json({ error: "Sesión no válida" });
  }
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    birthDate: user.birthDate,
    age: user.age,
    locale: user.locale,
  });
});

export default router;