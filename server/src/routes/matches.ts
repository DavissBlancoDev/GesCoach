import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Season } from "../models/Season";
import {
  Match,
  MATCH_COMPETITIONS,
  MATCH_VENUES,
  MATCH_STATUSES,
  type MatchStatus,
} from "../models/Match";
import { Opponent } from "../models/Opponent";
import { PlayerSeason } from "../models/PlayerSeason";
import type { Role } from "../models/Membership";
import { MAX_CALLUP } from "../lib/competitions";
import { normalizeName } from "../lib/text";
import {
  canEditCallup,
  canManageMatches,
  canRecordMatch,
  canSeeCallup,
} from "../lib/permissions";

// mergeParams permite leer :teamId, que viene del router padre en index.ts
const router = Router({ mergeParams: true });

// Todas las rutas exigen sesión y pertenecer al equipo
router.use(requireAuth, requireTeamMember);

type TeamParams = { teamId: string };
type MatchParams = TeamParams & { matchId: string };

/** Fecha en formato AAAA-MM-DD, convertida a Date. */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD")
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha no válida");

// Datos de un partido: sirven para programarlo y para editarlo
const matchSchema = z.object({
  competition: z.enum(MATCH_COMPETITIONS),
  venue: z.enum(MATCH_VENUES),
  opponentName: z.string().trim().min(1).max(80),
  date: dateString,
  // Sin hora, el partido queda "por confirmar"
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato esperado: HH:MM")
    .optional(),
  city: z.string().trim().max(80).optional(),
  fieldName: z.string().trim().max(120).optional(),
  observations: z.string().trim().max(1000).optional(),
});

const statusSchema = z.object({ status: z.enum(MATCH_STATUSES) });

const scoreSchema = z.object({
  goalsFor: z.number().int().min(0).max(99),
  goalsAgainst: z.number().int().min(0).max(99),
});

const callupSchema = z
  .object({
    players: z
      .array(z.string().refine((v) => mongoose.isValidObjectId(v), "Jugador no válido"))
      .max(40),
  })
  .refine((b) => new Set(b.players).size === b.players.length, {
    message: "Hay jugadores repetidos",
    path: ["players"],
  });

// Estados a los que se puede pasar desde cada uno. Un partido finalizado se
// puede reabrir (a "jugando") para corregir el resultado.
const NEXT_STATUSES: Record<MatchStatus, MatchStatus[]> = {
  pending: ["playing"],
  playing: ["pending", "finished"],
  finished: ["playing"],
};

type MatchDoc = InstanceType<typeof Match>;

/** Resultado desde nuestro punto de vista. Solo existe en un partido finalizado. */
function resultOf(match: MatchDoc): "win" | "draw" | "loss" | undefined {
  if (
    match.status !== "finished" ||
    typeof match.goalsFor !== "number" ||
    typeof match.goalsAgainst !== "number"
  ) {
    return undefined;
  }
  if (match.goalsFor > match.goalsAgainst) return "win";
  if (match.goalsFor < match.goalsAgainst) return "loss";
  return "draw";
}

/**
 * Convierte un partido en el objeto que se envía al cliente. El máximo de
 * convocados viaja con el partido para que el cliente no repita la regla, y
 * la convocatoria solo se envía a los roles que pueden verla.
 */
function toMatchItem(match: MatchDoc, opponent: { id: string; name: string }, role: Role) {
  return {
    id: match.id,
    competition: match.competition,
    venue: match.venue,
    opponent,
    date: match.date,
    time: match.time,
    city: match.city,
    fieldName: match.fieldName,
    observations: match.observations,
    status: match.status,
    goalsFor: match.goalsFor,
    goalsAgainst: match.goalsAgainst,
    result: resultOf(match),
    maxCallup: MAX_CALLUP[match.competition],
    callup: canSeeCallup(role) ? match.callup.map((c) => c.player.toString()) : undefined,
  };
}

/**
 * Busca el rival por su nombre y, si no existe, lo crea. Es una sola
 * operación atómica, así que dos peticiones a la vez no lo duplican.
 */
async function findOrCreateOpponent(teamId: string, name: string) {
  const opponent = await Opponent.findOneAndUpdate(
    { team: teamId, normalizedName: normalizeName(name) },
    { $setOnInsert: { name } },
    { upsert: true, new: true }
  );
  if (!opponent) throw new Error("No se pudo guardar el rival");
  return opponent;
}

/** Busca un partido por su id, solo si pertenece a este equipo. */
async function findMatch(teamId: string, matchId: string) {
  if (!mongoose.isValidObjectId(matchId)) return null;
  return Match.findOne({ _id: matchId, team: teamId });
}

/**
 * GET /api/teams/:teamId/matches
 * Partidos de la temporada actual, por orden de fecha.
 */
router.get<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;

  const season = await Season.findOne({ team: req.params.teamId, isCurrent: true });
  if (!season) {
    return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  }

  const matches = await Match.find({ season: season._id }).sort({ date: 1, time: 1 });

  // Los nombres de los rivales, en una sola consulta
  const opponents = await Opponent.find({ _id: { $in: matches.map((m) => m.opponent) } });
  const nameById = new Map<string, string>(opponents.map((o) => [o.id, o.name]));

  return res.json(
    matches.map((m) =>
      toMatchItem(
        m,
        { id: m.opponent.toString(), name: nameById.get(m.opponent.toString()) ?? "Rival" },
        role
      )
    )
  );
});

/**
 * GET /api/teams/:teamId/matches/opponents
 * Rivales ya usados, para sugerirlos al escribir el nombre en el formulario.
 * Va antes de "/:matchId", para que no se confunda con un identificador.
 */
router.get<TeamParams>("/opponents", async (req, res) => {
  const opponents = await Opponent.find({ team: req.params.teamId }).sort({ name: 1 });
  return res.json(opponents.map((o) => ({ id: o.id, name: o.name })));
});

/**
 * POST /api/teams/:teamId/matches
 * Programa un partido en la temporada actual.
 */
router.post<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageMatches(role)) {
    return res.status(403).json({ error: "No tienes permiso para programar partidos" });
  }

  const parsed = matchSchema.safeParse(req.body);
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

  const { opponentName, ...data } = parsed.data;
  const opponent = await findOrCreateOpponent(req.params.teamId, opponentName);

  const match = await Match.create({
    ...data,
    team: new mongoose.Types.ObjectId(req.params.teamId),
    season: season._id,
    opponent: opponent._id,
  });

  return res.status(201).json(toMatchItem(match, { id: opponent.id, name: opponent.name }, role));
});

/**
 * GET /api/teams/:teamId/matches/:matchId
 * Un partido.
 */
router.get<MatchParams>("/:matchId", async (req, res) => {
  const role = res.locals.role as Role;

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }

  const opponent = await Opponent.findById(match.opponent);
  return res.json(
    toMatchItem(
      match,
      { id: match.opponent.toString(), name: opponent?.name ?? "Rival" },
      role
    )
  );
});

/**
 * PUT /api/teams/:teamId/matches/:matchId
 * Sustituye los datos del partido (no su estado, resultado ni convocatoria).
 * Los campos opcionales que no se envían se borran.
 */
router.put<MatchParams>("/:matchId", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageMatches(role)) {
    return res.status(403).json({ error: "No tienes permiso para editar partidos" });
  }

  const parsed = matchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }

  const d = parsed.data;
  const opponent = await findOrCreateOpponent(req.params.teamId, d.opponentName);

  match.opponent = opponent._id;
  match.competition = d.competition;
  match.venue = d.venue;
  match.date = d.date;
  match.time = d.time || undefined;
  match.city = d.city || undefined;
  match.fieldName = d.fieldName || undefined;
  match.observations = d.observations || undefined;
  await match.save();

  return res.json(toMatchItem(match, { id: opponent.id, name: opponent.name }, role));
});

/**
 * PATCH /api/teams/:teamId/matches/:matchId/status
 * Cambia el estado del partido. Al empezar, el marcador arranca en 0-0. De
 * "jugando" solo se puede volver a "pendiente" si sigue 0-0, para no borrar
 * goles sin querer.
 */
router.patch<MatchParams>("/:matchId/status", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canRecordMatch(role)) {
    return res.status(403).json({ error: "No tienes permiso para cambiar el estado del partido" });
  }

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Estado no válido" });
  }

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }

  const next = parsed.data.status;
  if (!NEXT_STATUSES[match.status].includes(next)) {
    return res.status(409).json({ error: "No se puede hacer ese cambio de estado" });
  }

  if (next === "playing" && typeof match.goalsFor !== "number") {
    match.goalsFor = 0;
    match.goalsAgainst = 0;
  }
  if (next === "pending") {
    if (match.goalsFor || match.goalsAgainst) {
      return res.status(409).json({
        error: "El partido ya tiene goles: déjalo en juego o finalízalo",
      });
    }
    match.goalsFor = undefined;
    match.goalsAgainst = undefined;
  }

  match.status = next;
  await match.save();

  return res.json({
    id: match.id,
    status: match.status,
    goalsFor: match.goalsFor,
    goalsAgainst: match.goalsAgainst,
    result: resultOf(match),
  });
});

/**
 * PATCH /api/teams/:teamId/matches/:matchId/score
 * Cambia el resultado. Solo se puede mientras el partido está en juego; para
 * corregir uno finalizado, primero se reabre.
 */
router.patch<MatchParams>("/:matchId/score", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canRecordMatch(role)) {
    return res.status(403).json({ error: "No tienes permiso para cambiar el resultado" });
  }

  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Resultado no válido" });
  }

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }
  if (match.status !== "playing") {
    return res.status(409).json({ error: "El resultado solo se puede cambiar mientras se juega" });
  }

  match.goalsFor = parsed.data.goalsFor;
  match.goalsAgainst = parsed.data.goalsAgainst;
  await match.save();

  return res.json({ id: match.id, goalsFor: match.goalsFor, goalsAgainst: match.goalsAgainst });
});

/**
 * PUT /api/teams/:teamId/matches/:matchId/callup
 * Sustituye la convocatoria por la lista de jugadores enviada. Solo con el
 * partido pendiente. Reglas:
 *  - Los jugadores deben ser de la plantilla de la temporada del partido.
 *  - Los que se añaden de nuevo deben estar disponibles (un lesionado o
 *    sancionado que ya estaba convocado no se quita por cambiar de estado).
 *  - En liga, el máximo es el de la competición (ver lib/competitions.ts).
 */
router.put<MatchParams>("/:matchId/callup", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canEditCallup(role)) {
    return res.status(403).json({ error: "Solo el entrenador principal puede hacer la convocatoria" });
  }

  const parsed = callupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }
  if (match.status !== "pending") {
    return res.status(409).json({ error: "La convocatoria solo se puede cambiar con el partido pendiente" });
  }

  const ids = parsed.data.players;

  const max = MAX_CALLUP[match.competition];
  if (max !== null && ids.length > max) {
    return res.status(400).json({ error: `El máximo en esta competición es de ${max} convocados` });
  }

  const squad = await PlayerSeason.find({ season: match.season });
  const squadById = new Map(squad.map((entry) => [entry.player.toString(), entry]));
  const alreadyCalledUp = new Set(match.callup.map((c) => c.player.toString()));

  for (const id of ids) {
    const entry = squadById.get(id);
    if (!entry) {
      return res.status(400).json({ error: "Hay jugadores que no son de la plantilla" });
    }
    if (!alreadyCalledUp.has(id) && entry.status !== "available") {
      return res.status(400).json({ error: "Solo se pueden convocar jugadores disponibles" });
    }
  }

  match.callup = ids.map((player) => ({ player: new mongoose.Types.ObjectId(player) }));
  await match.save();

  return res.json({ id: match.id, callup: ids });
});

/**
 * DELETE /api/teams/:teamId/matches/:matchId
 * Borra el partido. El rival se conserva, porque puede estar en otros partidos.
 */
router.delete<MatchParams>("/:matchId", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageMatches(role)) {
    return res.status(403).json({ error: "No tienes permiso para borrar partidos" });
  }

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }

  await Match.deleteOne({ _id: match._id });
  return res.status(204).send();
});

export default router;
