import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { User } from "../models/User";

const router = Router();

// Todas las rutas exigen sesión iniciada
router.use(requireAuth);

/** Fecha en formato AAAA-MM-DD, convertida a Date. */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD")
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha no válida");

// Datos personales: se puede enviar solo lo que cambia
const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    surname: z.string().trim().min(1).max(100).optional(),
    birthDate: dateString
      .refine((d) => d.getUTCFullYear() >= 1900 && d < new Date(), "Fecha de nacimiento no válida")
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que actualizar" });

// Cambiar el correo exige la contraseña actual: es el dato con el que se inicia sesión
const emailSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  // El máximo de 72 es porque bcrypt solo usa los primeros 72 bytes
  newPassword: z.string().min(8).max(72),
});

type UserDoc = InstanceType<typeof User>;

/** El usuario tal como se envía al cliente (sin la contraseña). */
const toUserItem = (user: UserDoc) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  surname: user.surname,
  birthDate: user.birthDate,
  age: user.age,
  locale: user.locale,
});

/** Detecta el error de MongoDB por clave duplicada (índice único). */
const isDuplicateKeyError = (err: unknown) =>
  typeof err === "object" && err !== null && "code" in err && err.code === 11000;

/**
 * PATCH /api/account/profile
 * Cambia el nombre, los apellidos y/o la fecha de nacimiento.
 */
router.patch("/profile", async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await User.findById(res.locals.userId);
  if (!user) {
    return res.status(401).json({ error: "Sesión no válida" });
  }

  const d = parsed.data;
  if (d.name !== undefined) user.name = d.name;
  if (d.surname !== undefined) user.surname = d.surname;
  if (d.birthDate !== undefined) user.birthDate = d.birthDate;
  await user.save();

  return res.json(toUserItem(user));
});

/**
 * PATCH /api/account/email
 * Cambia el correo electrónico. Pide la contraseña actual para confirmar que
 * es la propia persona. De momento no se verifica el correo nuevo.
 */
router.patch("/email", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await User.findById(res.locals.userId).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Sesión no válida" });
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(400).json({ error: "La contraseña no es correcta" });
  }

  const email = parsed.data.email.toLowerCase();
  const taken = await User.exists({ email, _id: { $ne: user._id } });
  if (taken) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
  }

  try {
    user.email = email;
    await user.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
    }
    throw err;
  }

  return res.json(toUserItem(user));
});

/**
 * PUT /api/account/password
 * Cambia la contraseña, comprobando antes la actual.
 *
 * Limitación conocida: las sesiones que ya estén abiertas en otros
 * dispositivos siguen siendo válidas hasta que caduquen.
 */
router.put("/password", async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await User.findById(res.locals.userId).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Sesión no válida" });
  }

  const { currentPassword, newPassword } = parsed.data;
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: "La contraseña actual no es correcta" });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "La contraseña nueva debe ser distinta de la actual" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  return res.status(204).send();
});

export default router;
