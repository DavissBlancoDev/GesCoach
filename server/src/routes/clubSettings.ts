import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Team } from "../models/Team";
import { Membership, ROLES } from "../models/Membership";
import { User } from "../models/User";
import type { Role } from "../models/Membership";
import { canEditTeam } from "../lib/permissions";

// mergeParams permite leer :teamId, que viene del router padre en index.ts
const router = Router({ mergeParams: true });

// Todas las rutas exigen sesión y pertenecer al equipo
router.use(requireAuth, requireTeamMember);

type TeamParams = { teamId: string };

// Color hexadecimal de 6 cifras, por ejemplo "#1d4ed8"
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido");

// Ajustes del equipo: se puede enviar solo lo que cambia. Una cadena vacía en
// los campos opcionales (país y localidad) borra el valor.
const clubSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    country: z.union([z.literal(""), z.string().trim().length(2)]).optional(),
    fieldName: z.string().trim().min(1).max(120).optional(),
    // Es la localidad del campo (el campo ya existía como "ubicación")
    fieldLocation: z.string().trim().max(200).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que actualizar" });

/**
 * PATCH /api/teams/:teamId/club
 * Cambia el nombre, los colores, el país, la localidad y el campo del equipo.
 * Solo el entrenador principal.
 */
router.patch<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canEditTeam(role)) {
    return res.status(403).json({ error: "Solo el entrenador principal puede cambiar los ajustes" });
  }

  const parsed = clubSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const team = await Team.findById(req.params.teamId);
  if (!team) {
    return res.status(404).json({ error: "Equipo no encontrado" });
  }

  const d = parsed.data;
  if (d.name !== undefined) team.name = d.name;
  if (d.primaryColor !== undefined) team.primaryColor = d.primaryColor;
  if (d.secondaryColor !== undefined) team.secondaryColor = d.secondaryColor;
  if (d.fieldName !== undefined) team.fieldName = d.fieldName;
  // Asignar undefined borra el campo en la base de datos
  if (d.country !== undefined) team.country = d.country ? d.country.toUpperCase() : undefined;
  if (d.fieldLocation !== undefined) team.fieldLocation = d.fieldLocation || undefined;
  await team.save();

  return res.json(team);
});

/**
 * GET /api/teams/:teamId/club/members
 * Miembros del equipo con su rol, el entrenador principal primero. Todos los
 * miembros ven los nombres y los roles, pero el correo solo lo ve el
 * entrenador principal.
 */
router.get<TeamParams>("/members", async (req, res) => {
  const role = res.locals.role as Role;

  const memberships = await Membership.find({ team: req.params.teamId });
  const users = await User.find({ _id: { $in: memberships.map((m) => m.user) } });

  const members = memberships
    .flatMap((m) => {
      const user = users.find((u) => u.id === m.user.toString());
      return user
        ? [
            {
              id: user.id,
              name: user.name,
              surname: user.surname,
              role: m.role,
              email: canEditTeam(role) ? user.email : undefined,
              isYou: user.id === res.locals.userId,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.surname.localeCompare(b.surname, "es")
    );

  return res.json(members);
});

export default router;
