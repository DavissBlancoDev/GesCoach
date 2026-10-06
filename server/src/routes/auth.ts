import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, LOCALES } from "../models/User";

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

export default router;