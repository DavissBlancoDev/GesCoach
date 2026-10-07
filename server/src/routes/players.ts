import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Player, SALARY_PERIODS } from "../models/Player";
import { PlayerSeason, PLAYER_STATUSES } from "../models/PlayerSeason";
import { Season, CATEGORIES } from "../models/Season";
import type { Role } from "../models/Membership";
import { POSITIONS } from "../lib/positions";
import { canEditSquad, canSeeContract, canSeeGuardians } from "../lib/permissions";
import { yearsUntil } from "../utils/dates";

// mergeParams permite leer :teamId, que viene del router padre en index.ts
const router = Router({ mergeParams: true });

// Todas las rutas de este archivo exigen sesión y pertenecer al equipo
router.use(requireAuth, requireTeamMember);

// Parámetros de la URL que llegan desde el router padre (index.ts).
// Sin este tipo, TypeScript no sabe que existe req.params.teamId.
type TeamParams = { teamId: string };

/** Fecha en formato AAAA-MM-DD, convertida a Date. */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD")
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha no válida");

// Contacto de un tutor
const guardianSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().min(1).max(40),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().optional(),
});

// Contrato (todo el bloque es opcional en el jugador)
const contractSchema = z
  .object({
    startDate: dateString.optional(),
    endDate: dateString,
    salary: z.number().min(0).optional(),
    salaryPeriod: z.enum(SALARY_PERIODS).optional(),
  })
  // Un sueldo sin periodo (mensual o anual) no se puede interpretar
  .refine((c) => c.salary === undefined || c.salaryPeriod !== undefined, {
    message: "Indica si el sueldo es mensual o anual",
    path: ["salaryPeriod"],
  })
  .refine((c) => !c.startDate || c.endDate >= c.startDate, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["endDate"],
  });

// Datos para añadir un jugador a la plantilla de la temporada actual
const createPlayerSchema = z
  .object({
    // Datos de la persona
    name: z.string().trim().min(1).max(60),
    surname: z.string().trim().min(1).max(100),
    nickname: z.string().trim().max(40).optional(),
    birthDate: dateString.refine(
      (d) => d.getUTCFullYear() >= 1900 && d < new Date(),
      "Fecha de nacimiento no válida"
    ),
    nationality: z.string().trim().length(2).optional(),
    guardians: z.array(guardianSchema).max(4).default([]),
    contract: contractSchema.optional(),
    // Datos de la temporada
    licenseCategory: z.enum(CATEGORIES),
    jerseyNumber: z.number().int().min(0).max(99).optional(),
    mainPosition: z.enum(POSITIONS),
    secondaryPositions: z.array(z.enum(POSITIONS)).max(4).default([]),
    status: z.enum(PLAYER_STATUSES).default("available"),
  })
  .refine((d) => !d.secondaryPositions.includes(d.mainPosition), {
    message: "La posición principal no puede repetirse entre las secundarias",
    path: ["secondaryPositions"],
  });

type PlayerDoc = InstanceType<typeof Player>;
type SquadEntryDoc = InstanceType<typeof PlayerSeason>;

/**
 * Convierte un jugador y su ficha de temporada en el objeto que se envía
 * al cliente. Los datos sensibles (contrato, sueldo, tutores) solo se
 * incluyen si el rol del usuario tiene permiso para verlos.
 */
function toSquadItem(player: PlayerDoc, entry: SquadEntryDoc, role: Role) {
  return {
    id: player.id,
    squadId: entry.id,
    name: player.name,
    surname: player.surname,
    nickname: player.nickname,
    birthDate: player.birthDate,
    age: player.age,
    nationality: player.nationality,
    licenseCategory: entry.licenseCategory,
    jerseyNumber: entry.jerseyNumber,
    mainPosition: entry.mainPosition,
    secondaryPositions: entry.secondaryPositions,
    status: entry.status,
    guardians: canSeeGuardians(role)
      ? player.guardians.map((g) => ({
          name: g.name,
          relationship: g.relationship,
          phone: g.phone,
          email: g.email,
        }))
      : undefined,
    contract:
      canSeeContract(role) && player.contract
        ? {
            startDate: player.contract.startDate,
            endDate: player.contract.endDate,
            yearsLeft: yearsUntil(player.contract.endDate),
            salary: player.contract.salary,
            salaryPeriod: player.contract.salaryPeriod,
          }
        : undefined,
  };
}

/** Detecta el error de MongoDB por clave duplicada (índice único). */
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === 11000;
}

/**
 * GET /api/teams/:teamId/players
 * Plantilla de la temporada actual, ordenada por apellidos.
 */
router.get<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;

  const season = await Season.findOne({ team: req.params.teamId, isCurrent: true });
  if (!season) {
    return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  }

  // Dos consultas en vez de una por jugador
  const entries = await PlayerSeason.find({ season: season._id });
  const players = await Player.find({ _id: { $in: entries.map((e) => e.player) } });

  const items = entries
    .flatMap((entry) => {
      const player = players.find((p) => p.id === entry.player.toString());
      return player ? [toSquadItem(player, entry, role)] : [];
    })
    .sort((a, b) => a.surname.localeCompare(b.surname, "es"));

  return res.json(items);
});

/**
 * POST /api/teams/:teamId/players
 * Crea un jugador y lo añade a la plantilla de la temporada actual.
 * Se guardan los dos documentos en una transacción: o se crean ambos o
 * ninguno, para no dejar un jugador sin ficha de temporada.
 */
router.post<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canEditSquad(role)) {
    return res.status(403).json({ error: "No tienes permiso para editar la plantilla" });
  }

  const parsed = createPlayerSchema.safeParse(req.body);
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

  // Separamos los datos de la persona de los de la temporada
  const { licenseCategory, jerseyNumber, mainPosition, secondaryPositions, status, ...personData } =
    parsed.data;

  // requireTeamMember ya comprobó que teamId es un identificador válido
  const teamId = new mongoose.Types.ObjectId(req.params.teamId);

  try {
    const { player, entry } = await mongoose.connection.transaction(async (session) => {
      const [player] = await Player.create([{ ...personData, team: teamId }], { session });
      const [entry] = await PlayerSeason.create(
        [
          {
            player: player._id,
            season: season._id,
            licenseCategory,
            jerseyNumber,
            mainPosition,
            secondaryPositions,
            status,
          },
        ],
        { session }
      );
      return { player, entry };
    });

    return res.status(201).json(toSquadItem(player, entry, role));
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ error: "Ese dorsal ya está en uso en esta temporada" });
    }
    throw err;
  }
});

export default router;