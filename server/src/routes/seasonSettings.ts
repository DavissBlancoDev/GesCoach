import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Season, CATEGORIES, MODALITIES } from "../models/Season";
import { Match } from "../models/Match";
import { PlayerSeason } from "../models/PlayerSeason";
import type { Role } from "../models/Membership";
import { canEditTeam } from "../lib/permissions";

// mergeParams permite leer :teamId, que viene del router padre en index.ts
const router = Router({ mergeParams: true });

// Todas las rutas exigen sesión y pertenecer al equipo
router.use(requireAuth, requireTeamMember);

type TeamParams = { teamId: string };

// Ajustes de la temporada. De momento solo uno: cuántas tarjetas amarillas
// suponen una sanción. Depende del reglamento de la competición.
const settingsSchema = z.object({
  yellowCardsLimit: z.number().int().min(2).max(10),
});

/**
 * PATCH /api/teams/:teamId/season/settings
 * Cambia los ajustes de la temporada actual. Solo el entrenador principal.
 */
router.patch<TeamParams>("/settings", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canEditTeam(role)) {
    return res.status(403).json({ error: "Solo el entrenador principal puede cambiar los ajustes" });
  }

  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const season = await Season.findOneAndUpdate(
    { team: req.params.teamId, isCurrent: true },
    { yellowCardsLimit: parsed.data.yellowCardsLimit },
    { new: true }
  );
  if (!season) {
    return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  }

  return res.json({ id: season.id, yellowCardsLimit: season.yellowCardsLimit });
});

// Datos de la temporada: se puede enviar solo lo que cambia
const seasonSchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    modality: z.enum(MODALITIES).optional(),
    startYear: z.number().int().min(2000).max(2100).optional(),
    matchDuration: z.number().int().min(10).max(120).optional(),
    // Nombre de la liga (la división en la que juega el equipo)
    division: z.string().trim().min(1).max(120).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No hay nada que actualizar" });

/**
 * PATCH /api/teams/:teamId/season
 * Cambia los datos de la temporada actual. Solo el entrenador principal.
 *
 * La categoría y la modalidad no se pueden cambiar si la temporada ya tiene
 * jugadores o partidos, porque condicionan las fichas, las formaciones y las
 * reglas de los partidos.
 */
router.patch<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canEditTeam(role)) {
    return res.status(403).json({ error: "Solo el entrenador principal puede cambiar los ajustes" });
  }

  const parsed = seasonSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const season = await Season.findOne({ team: req.params.teamId, isCurrent: true });
  if (!season) {
    return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  }

  const d = parsed.data;
  const changesStructure =
    (d.category !== undefined && d.category !== season.category) ||
    (d.modality !== undefined && d.modality !== season.modality);

  if (changesStructure) {
    const [players, matches] = await Promise.all([
      PlayerSeason.countDocuments({ season: season._id }),
      Match.countDocuments({ season: season._id }),
    ]);
    if (players > 0 || matches > 0) {
      return res.status(409).json({
        error:
          "No se pueden cambiar la categoría ni la modalidad: ya hay jugadores o partidos en esta temporada",
      });
    }
  }

  if (d.category !== undefined) season.category = d.category;
  if (d.modality !== undefined) season.modality = d.modality;
  if (d.startYear !== undefined) season.startYear = d.startYear;
  if (d.matchDuration !== undefined) season.matchDuration = d.matchDuration;
  if (d.division !== undefined) season.division = d.division;
  await season.save();

  return res.json(season);
});

export default router;
