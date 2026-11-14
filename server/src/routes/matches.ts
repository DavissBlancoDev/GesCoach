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
  MATCH_EVENT_TYPES,
  MATCH_EVENT_SIDES,
  FORMATION_OPTIONS,
  type MatchStatus,
} from "../models/Match";
import { Opponent } from "../models/Opponent";
import { PlayerSeason } from "../models/PlayerSeason";
import type { Role } from "../models/Membership";
import { MAX_CALLUP } from "../lib/competitions";
import {
  buildSquadMap,
  duplicatedJerseys,
  lineupProblems,
  startersRequired,
  type SquadInfo,
} from "../lib/lineup";
import { normalizeName } from "../lib/text";
import {
  canEditCallup,
  canEditLineup,
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

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Identificador no válido");

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
  // Si no se indica al programarlo, se usa la duración de la temporada
  durationMinutes: z.number().int().min(10).max(120).optional(),
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
  .object({ players: z.array(objectId).max(40) })
  .refine((b) => new Set(b.players).size === b.players.length, {
    message: "Hay jugadores repetidos",
    path: ["players"],
  });

// Alineación: un elemento por cada convocado, con su papel y, si hace falta,
// el dorsal de ese partido
const lineupSchema = z
  .object({
    players: z
      .array(
        z.object({
          player: objectId,
          starter: z.boolean(),
          jerseyNumber: z.number().int().min(0).max(99).optional(),
          slot: z.string().trim().max(40).optional(),
        })
      )
      .max(40),
    goalkeeper: objectId.nullable().optional(),
    formation: z.enum(FORMATION_OPTIONS).optional(),
  })
  .refine((b) => new Set(b.players.map((p) => p.player)).size === b.players.length, {
    message: "Hay jugadores repetidos",
    path: ["players"],
  });

const eventSchema = z
  .object({
    type: z.enum(MATCH_EVENT_TYPES),
    minute: z.number().int().min(0).max(120),
    side: z.enum(MATCH_EVENT_SIDES).optional(),
    player: objectId.optional(),
    assist: objectId.optional(),
    playerIn: objectId.optional(),
    playerOut: objectId.optional(),
    opponentJerseyNumber: z.number().int().min(0).max(99).optional(),
    penalty: z.boolean().default(false),
    ownGoal: z.boolean().default(false),
  })
  .superRefine((event, ctx) => {
    if (event.type === "goal" && !event.side) {
      ctx.addIssue({ code: "custom", path: ["side"], message: "Indica de qué equipo es el gol" });
    }
    if ((event.type === "yellow_card" || event.type === "red_card") && !event.player) {
      ctx.addIssue({ code: "custom", path: ["player"], message: "Indica el jugador" });
    }
    if (event.type === "substitution" && (!event.playerIn || !event.playerOut)) {
      ctx.addIssue({ code: "custom", path: ["playerIn"], message: "Indica quién entra y quién sale" });
    }
    if (event.type !== "goal" && (event.side || event.assist || event.penalty || event.ownGoal)) {
      ctx.addIssue({ code: "custom", message: "Esos datos solo se aplican a los goles" });
    }
    if (event.type !== "goal" && event.opponentJerseyNumber !== undefined) {
      ctx.addIssue({ code: "custom", message: "El dorsal rival solo se aplica a los goles" });
    }
    if (event.type === "goal" && event.side !== "against" && event.opponentJerseyNumber !== undefined) {
      ctx.addIssue({ code: "custom", path: ["opponentJerseyNumber"], message: "El dorsal rival solo se aplica a goles rivales" });
    }
  });

// Estados a los que se puede pasar desde cada uno. Un partido finalizado se
// puede reabrir (a "jugando") para corregir el resultado.
const NEXT_STATUSES: Record<MatchStatus, MatchStatus[]> = {
  pending: ["playing"],
  playing: ["pending", "finished"],
  finished: ["playing"],
};

type MatchDoc = InstanceType<typeof Match>;

// Lo que se necesita de la temporada para presentar un partido
interface SeasonInfo {
  matchDuration: number;
  modality: string;
}

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
 * convocados, los titulares que hacen falta y la duración viajan con el
 * partido para que el cliente no repita las reglas. La convocatoria y la
 * alineación solo se envían a los roles que pueden verlas.
 */
function toMatchItem(
  match: MatchDoc,
  opponent: { id: string; name: string },
  role: Role,
  season: SeasonInfo,
  squad: Map<string, SquadInfo>
) {
  const required = startersRequired(season.modality);
  const canSee = canSeeCallup(role);

  return {
    id: match.id,
    competition: match.competition,
    venue: match.venue,
    opponent,
    date: match.date,
    time: match.time,
    durationMinutes: match.durationMinutes ?? season.matchDuration,
    city: match.city,
    fieldName: match.fieldName,
    observations: match.observations,
    status: match.status,
    goalsFor: match.goalsFor,
    goalsAgainst: match.goalsAgainst,
    result: resultOf(match),
    events: canSee
      ? match.events.map((event) => ({
          id: event._id?.toString() ?? "",
          type: event.type,
          minute: event.minute,
          side: event.side,
          player: event.player?.toString(),
          assist: event.assist?.toString(),
          playerIn: event.playerIn?.toString(),
          playerOut: event.playerOut?.toString(),
          opponentJerseyNumber: event.opponentJerseyNumber,
          penalty: event.penalty,
          ownGoal: event.ownGoal,
        }))
      : undefined,
    maxCallup: MAX_CALLUP[match.competition],
    callup: canSee ? match.callup.map((c) => c.player.toString()) : undefined,
    lineup: canSee
      ? {
          startersRequired: required,
          players: match.callup.map((c) => ({
            player: c.player.toString(),
            starter: c.starter,
            jerseyNumber: c.jerseyNumber,
            slot: c.slot,
          })),
          goalkeeper: match.goalkeeper?.toString(),
          formation: match.formation,
          // Lo que falta para poder empezar el partido (vacío = completa)
          problems: lineupProblems(match, squad, required),
        }
      : undefined,
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

/** Dorsales fijos de la plantilla de una temporada. */
async function loadSquad(seasonId: mongoose.Types.ObjectId) {
  return buildSquadMap(await PlayerSeason.find({ season: seasonId }));
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

  // Los nombres de los rivales y los dorsales de la plantilla, cada uno en una sola consulta
  const opponents = await Opponent.find({ _id: { $in: matches.map((m) => m.opponent) } });
  const nameById = new Map<string, string>(opponents.map((o) => [o.id, o.name]));
  const squad = await loadSquad(season._id);

  return res.json(
    matches.map((m) =>
      toMatchItem(
        m,
        { id: m.opponent.toString(), name: nameById.get(m.opponent.toString()) ?? "Rival" },
        role,
        season,
        squad
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
 * Programa un partido en la temporada actual. La duración se copia de la
 * temporada si no se indica otra.
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
    durationMinutes: data.durationMinutes ?? season.matchDuration,
    team: new mongoose.Types.ObjectId(req.params.teamId),
    season: season._id,
    opponent: opponent._id,
  });

  return res
    .status(201)
    .json(toMatchItem(match, { id: opponent.id, name: opponent.name }, role, season, new Map()));
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

  const season = await Season.findById(match.season);
  if (!season) {
    return res.status(404).json({ error: "Temporada no encontrada" });
  }

  const opponent = await Opponent.findById(match.opponent);
  const squad = await loadSquad(season._id);
  return res.json(
    toMatchItem(
      match,
      { id: match.opponent.toString(), name: opponent?.name ?? "Rival" },
      role,
      season,
      squad
    )
  );
});

/**
 * PUT /api/teams/:teamId/matches/:matchId
 * Sustituye los datos del partido (no su estado, resultado, convocatoria ni
 * alineación). Los campos opcionales que no se envían se borran, salvo la
 * duración, que se conserva si no llega.
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

  const season = await Season.findById(match.season);
  if (!season) {
    return res.status(404).json({ error: "Temporada no encontrada" });
  }

  const d = parsed.data;
  const opponent = await findOrCreateOpponent(req.params.teamId, d.opponentName);

  match.opponent = opponent._id;
  match.competition = d.competition;
  match.venue = d.venue;
  match.date = d.date;
  match.time = d.time || undefined;
  if (d.durationMinutes !== undefined) match.durationMinutes = d.durationMinutes;
  match.city = d.city || undefined;
  match.fieldName = d.fieldName || undefined;
  match.observations = d.observations || undefined;
  await match.save();

  const squad = await loadSquad(season._id);
  return res.json(
    toMatchItem(match, { id: opponent.id, name: opponent.name }, role, season, squad)
  );
});

/**
 * PATCH /api/teams/:teamId/matches/:matchId/status
 * Cambia el estado del partido.
 *  - Para empezarlo (de pendiente a jugando) hace falta la alineación
 *    completa: convocatoria, titulares, portero y dorsales.
 *  - Al empezar, el marcador arranca en 0-0.
 *  - De "jugando" solo se puede volver a "pendiente" si sigue 0-0, para no
 *    borrar goles sin querer.
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

  // Empezar el partido exige la alineación completa. Reabrir uno finalizado, no.
  if (match.status === "pending" && next === "playing") {
    const season = await Season.findById(match.season);
    if (!season) {
      return res.status(404).json({ error: "Temporada no encontrada" });
    }
    const squad = await loadSquad(season._id);
    const problems = lineupProblems(match, squad, startersRequired(season.modality));
    if (problems.length > 0) {
      return res.status(409).json({
        error: "Falta completar la alineación para empezar el partido",
        details: { lineup: problems },
      });
    }
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
 *  - Los que siguen convocados conservan su papel y su dorsal en la
 *    alineación. Si se quita a un titular, deja de serlo, y si era el
 *    portero, el partido se queda sin portero.
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
  const previous = new Map(match.callup.map((c) => [c.player.toString(), c]));

  for (const id of ids) {
    const entry = squadById.get(id);
    if (!entry) {
      return res.status(400).json({ error: "Hay jugadores que no son de la plantilla" });
    }
    if (!previous.has(id) && entry.status !== "available") {
      return res.status(400).json({ error: "Solo se pueden convocar jugadores disponibles" });
    }
  }

  // Titulares que se quedan fuera de la convocatoria
  const removedStarters = match.callup.filter(
    (c) => c.starter && !ids.includes(c.player.toString())
  ).length;

  match.callup = ids.map((id) => {
    const prev = previous.get(id);
    return prev
      ? { player: prev.player, jerseyNumber: prev.jerseyNumber, starter: prev.starter, slot: prev.slot }
      : { player: new mongoose.Types.ObjectId(id), starter: false };
  });
  if (match.goalkeeper && !ids.includes(match.goalkeeper.toString())) {
    match.goalkeeper = undefined;
  }
  await match.save();

  return res.json({ id: match.id, callup: ids, removedStarters });
});

/**
 * PUT /api/teams/:teamId/matches/:matchId/lineup
 * Guarda la alineación: quiénes son titulares, el portero y el dorsal de
 * este partido de cada convocado. Con el partido pendiente o jugando y solo
 * el entrenador principal. Se puede guardar incompleta; para empezar el partido
 * tendrá que estar completa.
 *
 * Reglas:
 *  - Debe incluir exactamente a los convocados.
 *  - No puede haber más titulares de los que marca la modalidad.
 *  - El portero debe ser uno de los titulares.
 *  - Los dorsales no se pueden repetir. Cuenta el del partido si lo hay y, si
 *    no, el fijo de la temporada. El dorsal fijo del jugador no cambia.
 */
router.put<MatchParams>("/:matchId/lineup", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canEditLineup(role)) {
    return res.status(403).json({ error: "Solo el entrenador principal puede hacer la alineación" });
  }

  const parsed = lineupSchema.safeParse(req.body);
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
  if (match.status !== "pending" && match.status !== "playing") {
    return res.status(409).json({ error: "La alineación solo se puede cambiar con el partido pendiente o jugando" });
  }

  const season = await Season.findById(match.season);
  if (!season) {
    return res.status(404).json({ error: "Temporada no encontrada" });
  }

  const sent = parsed.data.players;
  const calledUp = new Set(match.callup.map((c) => c.player.toString()));
  if (sent.length !== calledUp.size || sent.some((p) => !calledUp.has(p.player))) {
    return res.status(400).json({ error: "La alineación debe incluir exactamente a los convocados" });
  }

  const required = startersRequired(season.modality);
  const starters = sent.filter((p) => p.starter);
  if (starters.length > required) {
    return res.status(400).json({ error: `No puede haber más de ${required} titulares` });
  }

  const goalkeeper = parsed.data.goalkeeper ?? undefined;
  if (goalkeeper && !starters.some((p) => p.player === goalkeeper)) {
    return res.status(400).json({ error: "El portero debe ser uno de los titulares" });
  }

  const entries = sent.map((p) => ({
    player: new mongoose.Types.ObjectId(p.player),
    starter: p.starter,
    jerseyNumber: p.jerseyNumber,
    slot: p.slot,
  }));

  const squad = await loadSquad(season._id);
  const duplicated = duplicatedJerseys(entries, squad);
  if (duplicated.length > 0) {
    return res.status(400).json({
      error: `Hay dorsales repetidos: ${duplicated.join(", ")}`,
    });
  }

  match.callup = entries;
  match.goalkeeper = goalkeeper ? new mongoose.Types.ObjectId(goalkeeper) : undefined;
  match.formation = parsed.data.formation;
  await match.save();

  const opponent = await Opponent.findById(match.opponent);
  return res.json(
    toMatchItem(
      match,
      { id: match.opponent.toString(), name: opponent?.name ?? "Rival" },
      role,
      season,
      squad
    )
  );
});

/** Añade un evento al acta mientras el partido está en juego. */
router.post<MatchParams>("/:matchId/events", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canRecordMatch(role)) {
    return res.status(403).json({ error: "No tienes permiso para registrar eventos" });
  }

  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos no válidos", details: parsed.error.flatten().fieldErrors });
  }

  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (match.status !== "playing") {
    return res.status(409).json({ error: "Los eventos solo se pueden registrar mientras se juega" });
  }

  const event = parsed.data;
  const calledUp = new Set(match.callup.map((entry) => entry.player.toString()));
  const involved = [event.player, event.assist, event.playerIn, event.playerOut].filter(Boolean) as string[];
  if (involved.some((id) => !calledUp.has(id))) {
    return res.status(400).json({ error: "El jugador debe pertenecer a la convocatoria" });
  }
  if (event.assist && event.assist === event.player) {
    return res.status(400).json({ error: "El goleador y el asistente deben ser distintos" });
  }
  if (event.playerIn && event.playerIn === event.playerOut) {
    return res.status(400).json({ error: "El jugador que entra y el que sale deben ser distintos" });
  }

  match.events.push({
    ...event,
    player: event.player ? new mongoose.Types.ObjectId(event.player) : undefined,
    assist: event.assist ? new mongoose.Types.ObjectId(event.assist) : undefined,
    playerIn: event.playerIn ? new mongoose.Types.ObjectId(event.playerIn) : undefined,
    playerOut: event.playerOut ? new mongoose.Types.ObjectId(event.playerOut) : undefined,
    opponentJerseyNumber: event.opponentJerseyNumber,
  });
  if (event.type === "goal") {
    if (event.side === "for") match.goalsFor = (match.goalsFor ?? 0) + 1;
    if (event.side === "against") match.goalsAgainst = (match.goalsAgainst ?? 0) + 1;
  }
  await match.save();
  const savedEvent = match.events[match.events.length - 1];
  return res.status(201).json({ id: savedEvent._id?.toString() ?? "" });
});

/** Elimina un evento y ajusta el marcador si era un gol. */
router.delete<MatchParams & { eventId: string }>("/:matchId/events/:eventId", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canRecordMatch(role)) return res.status(403).json({ error: "No tienes permiso para editar eventos" });
  const match = await findMatch(req.params.teamId, req.params.matchId);
  if (!match) return res.status(404).json({ error: "Partido no encontrado" });
  if (match.status !== "playing") return res.status(409).json({ error: "Solo se pueden editar eventos mientras se juega" });

  const event = match.events.find((item) => item._id?.toString() === req.params.eventId);
  if (!event) return res.status(404).json({ error: "Evento no encontrado" });
  if (event.type === "goal") {
    if (event.side === "for") match.goalsFor = Math.max(0, (match.goalsFor ?? 0) - 1);
    if (event.side === "against") match.goalsAgainst = Math.max(0, (match.goalsAgainst ?? 0) - 1);
  }
  match.events.splice(match.events.indexOf(event), 1);
  await match.save();
  return res.status(204).send();
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
