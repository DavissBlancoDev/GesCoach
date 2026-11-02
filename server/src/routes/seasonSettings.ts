import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Season } from "../models/Season";
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

export default router;
