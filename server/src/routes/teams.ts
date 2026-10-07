import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { Team } from "../models/Team";
import { Season, MODALITIES, CATEGORIES } from "../models/Season";
import { Membership } from "../models/Membership";

const router = Router();

// Color hexadecimal de 6 cifras, por ejemplo "#1d4ed8"
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido");

// Datos que llegan desde el asistente de creación de equipo
const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(60),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  fieldName: z.string().trim().min(1).max(120),
  fieldLocation: z.string().trim().max(200).optional(),
  season: z.object({
    startYear: z.number().int().min(2000).max(2100),
    category: z.enum(CATEGORIES),
    modality: z.enum(MODALITIES),
    division: z.string().trim().min(1).max(120),
    matchDuration: z.number().int().min(10).max(120),
  }),
});

/**
 * POST /api/teams
 * Crea el equipo, su primera temporada y la membresía del usuario como
 * entrenador principal. Los tres documentos se guardan en una transacción:
 * o se crean todos o no se crea ninguno, para no dejar datos huérfanos.
 */
router.post("/", requireAuth, async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const userId = res.locals.userId;
  const { season: seasonData, ...teamData } = parsed.data;

  const session = await mongoose.startSession();
  try {
    let result: { team: unknown; season: unknown } | undefined;

    await session.withTransaction(async () => {
      const [team] = await Team.create([{ ...teamData, createdBy: userId }], { session });
      const [season] = await Season.create(
        [{ ...seasonData, team: team._id, isCurrent: true }],
        { session }
      );
      await Membership.create(
        [{ user: userId, team: team._id, role: "head_coach" }],
        { session }
      );
      result = { team, season };
    });

    return res.status(201).json(result);
  } finally {
    await session.endSession();
  }
});

/**
 * GET /api/teams/mine
 * Devuelve los equipos del usuario con su rol y su temporada actual.
 * El cliente lo usa para decidir si mostrar el asistente de creación
 * de equipo (lista vacía) o el dashboard.
 */
router.get("/mine", requireAuth, async (_req, res) => {
  const userId = res.locals.userId;

  const memberships = await Membership.find({ user: userId });
  const teamIds = memberships.map((m) => m.team);

  // Dos consultas en paralelo en vez de una por equipo
  const [teams, seasons] = await Promise.all([
    Team.find({ _id: { $in: teamIds } }),
    Season.find({ team: { $in: teamIds }, isCurrent: true }),
  ]);

  return res.json(
    memberships.map((m) => ({
      role: m.role,
      team: teams.find((t) => t.id === m.team.toString()) ?? null,
      currentSeason: seasons.find((s) => s.team.toString() === m.team.toString()) ?? null,
    }))
  );
});

export default router;