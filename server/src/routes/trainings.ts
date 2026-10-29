import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Season } from "../models/Season";
import { Training } from "../models/Training";
import { Attendance, ATTENDANCE_STATUSES } from "../models/Attendance";
import { Player } from "../models/Player";
import { PlayerSeason } from "../models/PlayerSeason";
import type { Role } from "../models/Membership";
import { canManageTrainings, canSeeStats } from "../lib/permissions";

// mergeParams permite leer :teamId, que viene del router padre en index.ts
const router = Router({ mergeParams: true });

// Todas las rutas exigen sesión y pertenecer al equipo
router.use(requireAuth, requireTeamMember);

type TeamParams = { teamId: string };
type TrainingParams = TeamParams & { trainingId: string };

/** Fecha en formato AAAA-MM-DD, convertida a Date. */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD")
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Fecha no válida");

// Datos de un entreno: sirven para crearlo y para actualizarlo
const trainingSchema = z.object({
  date: dateString,
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato esperado: HH:MM")
    .optional(),
  durationMinutes: z.number().int().min(10).max(240).optional(),
  location: z.string().trim().max(120).optional(),
  objectives: z.string().trim().max(1000).optional(),
});

// Un entreno solo se puede suspender o volver a programar a mano.
// El estado "celebrado" lo pone el servidor al guardar la lista.
const statusSchema = z.object({ status: z.enum(["scheduled", "cancelled"]) });

// Lista de asistencia: un registro por jugador
const attendanceSchema = z
  .object({
    records: z
      .array(
        z.object({
          player: z.string().refine((v) => mongoose.isValidObjectId(v), "Jugador no válido"),
          status: z.enum(ATTENDANCE_STATUSES),
        })
      )
      .min(1)
      .max(100),
  })
  .refine((b) => new Set(b.records.map((r) => r.player)).size === b.records.length, {
    message: "Hay jugadores repetidos",
    path: ["records"],
  });

type TrainingDoc = InstanceType<typeof Training>;

// Recuento de asistencia de un entreno
interface AttendanceSummary {
  present: number;
  justifiedAbsence: number;
  unjustifiedAbsence: number;
}

const emptySummary = (): AttendanceSummary => ({
  present: 0,
  justifiedAbsence: 0,
  unjustifiedAbsence: 0,
});

/** Convierte un entreno en el objeto que se envía al cliente. */
const toTrainingItem = (t: TrainingDoc, attendance?: AttendanceSummary) => ({
  id: t.id,
  date: t.date,
  startTime: t.startTime,
  durationMinutes: t.durationMinutes,
  location: t.location,
  objectives: t.objectives,
  status: t.status,
  attendance,
});

/** Recuento de asistencia de varios entrenos, en una sola consulta. */
async function summariesFor(trainingIds: mongoose.Types.ObjectId[]) {
  const rows = await Attendance.aggregate<{
    _id: { training: mongoose.Types.ObjectId; status: string };
    n: number;
  }>([
    { $match: { training: { $in: trainingIds } } },
    { $group: { _id: { training: "$training", status: "$status" }, n: { $sum: 1 } } },
  ]);

  const map = new Map<string, AttendanceSummary>();
  for (const row of rows) {
    const key = row._id.training.toString();
    const summary = map.get(key) ?? emptySummary();
    if (row._id.status === "present") summary.present = row.n;
    else if (row._id.status === "justified_absence") summary.justifiedAbsence = row.n;
    else summary.unjustifiedAbsence = row.n;
    map.set(key, summary);
  }
  return map;
}

/** Busca un entreno por su id, solo si pertenece a este equipo. */
async function findTraining(teamId: string, trainingId: string) {
  if (!mongoose.isValidObjectId(trainingId)) return null;
  return Training.findOne({ _id: trainingId, team: teamId });
}

/**
 * GET /api/teams/:teamId/trainings
 * Entrenos de la temporada actual, por orden de fecha. El recuento de
 * asistencia solo se envía a los roles que pueden ver estadísticas.
 */
router.get<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;

  const season = await Season.findOne({ team: req.params.teamId, isCurrent: true });
  if (!season) {
    return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  }

  const trainings = await Training.find({ season: season._id }).sort({ date: 1, startTime: 1 });
  const summaries = canSeeStats(role) ? await summariesFor(trainings.map((t) => t._id)) : null;

  return res.json(
    trainings.map((t) =>
      toTrainingItem(t, summaries ? (summaries.get(t.id) ?? emptySummary()) : undefined)
    )
  );
});

/**
 * POST /api/teams/:teamId/trainings
 * Crea un entreno en la temporada actual. Se permiten fechas pasadas, para
 * registrar entrenos que ya se hicieron.
 */
router.post<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) {
    return res.status(403).json({ error: "No tienes permiso para gestionar entrenos" });
  }

  const parsed = trainingSchema.safeParse(req.body);
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

  const training = await Training.create({
    ...parsed.data,
    team: new mongoose.Types.ObjectId(req.params.teamId),
    season: season._id,
  });

  return res.status(201).json(toTrainingItem(training));
});

/**
 * GET /api/teams/:teamId/trainings/:trainingId
 * Un entreno con la lista de jugadores y su asistencia. Salen los jugadores
 * de la plantilla de esa temporada que no están inactivos, y también los
 * inactivos que ya tengan registro. La lista solo se envía a quien puede
 * ver estadísticas.
 */
router.get<TrainingParams>("/:trainingId", async (req, res) => {
  const role = res.locals.role as Role;

  const training = await findTraining(req.params.teamId, req.params.trainingId);
  if (!training) {
    return res.status(404).json({ error: "Entreno no encontrado" });
  }
  if (!canSeeStats(role)) {
    return res.json(toTrainingItem(training));
  }

  const squad = await PlayerSeason.find({ season: training.season });
  const records = await Attendance.find({ training: training._id });
  const statusByPlayer = new Map<string, string>(
    records.map((r) => [r.player.toString(), r.status])
  );

  const visible = squad.filter(
    (entry) => entry.status !== "inactive" || statusByPlayer.has(entry.player.toString())
  );
  const players = await Player.find({ _id: { $in: visible.map((e) => e.player) } });

  const items = visible
    .flatMap((entry) => {
      const player = players.find((p) => p.id === entry.player.toString());
      return player
        ? [
            {
              id: player.id,
              name: player.name,
              surname: player.surname,
              nickname: player.nickname,
              jerseyNumber: entry.jerseyNumber,
              playerStatus: entry.status,
              attendance: statusByPlayer.get(player.id) ?? null,
            },
          ]
        : [];
    })
    .sort((a, b) => a.surname.localeCompare(b.surname, "es"));

  const summaries = await summariesFor([training._id]);
  return res.json({
    ...toTrainingItem(training, summaries.get(training.id) ?? emptySummary()),
    players: items,
  });
});

/**
 * PUT /api/teams/:teamId/trainings/:trainingId
 * Sustituye los datos del entreno. Los campos opcionales que no se envían
 * se borran.
 */
router.put<TrainingParams>("/:trainingId", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) {
    return res.status(403).json({ error: "No tienes permiso para gestionar entrenos" });
  }

  const parsed = trainingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const training = await findTraining(req.params.teamId, req.params.trainingId);
  if (!training) {
    return res.status(404).json({ error: "Entreno no encontrado" });
  }

  const d = parsed.data;
  training.date = d.date;
  training.startTime = d.startTime || undefined;
  training.durationMinutes = d.durationMinutes;
  training.location = d.location || undefined;
  training.objectives = d.objectives || undefined;
  await training.save();

  return res.json(toTrainingItem(training));
});

/**
 * PATCH /api/teams/:teamId/trainings/:trainingId/status
 * Suspende un entreno o lo vuelve a programar. Al volver a programar, si ya
 * tenía asistencia registrada, queda como celebrado.
 */
router.patch<TrainingParams>("/:trainingId/status", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) {
    return res.status(403).json({ error: "No tienes permiso para gestionar entrenos" });
  }

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Estado no válido" });
  }

  const training = await findTraining(req.params.teamId, req.params.trainingId);
  if (!training) {
    return res.status(404).json({ error: "Entreno no encontrado" });
  }

  if (parsed.data.status === "cancelled") {
    training.status = "cancelled";
  } else {
    const hasRecords = await Attendance.exists({ training: training._id });
    training.status = hasRecords ? "held" : "scheduled";
  }
  await training.save();

  return res.json({ id: training.id, status: training.status });
});

/**
 * PUT /api/teams/:teamId/trainings/:trainingId/attendance
 * Guarda la asistencia de los jugadores enviados (crea o actualiza su
 * registro) y marca el entreno como celebrado.
 *
 * Regla: al pasar lista por primera vez, todos los jugadores no inactivos
 * deben quedar marcados; si no, quien se quedara sin marcar no tendría
 * registro y su porcentaje saldría falseado sin avisar. En un entreno ya
 * celebrado solo se exige lo que ya estaba registrado, porque un jugador
 * que llegó después no tiene por qué contar ese entreno.
 */
router.put<TrainingParams>("/:trainingId/attendance", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) {
    return res.status(403).json({ error: "No tienes permiso para pasar lista" });
  }

  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const training = await findTraining(req.params.teamId, req.params.trainingId);
  if (!training) {
    return res.status(404).json({ error: "Entreno no encontrado" });
  }
  if (training.status === "cancelled") {
    return res.status(409).json({ error: "No se puede pasar lista en un entreno suspendido" });
  }

  const { records } = parsed.data;

  // Todos los jugadores enviados deben ser de la plantilla de esa temporada
  const squad = await PlayerSeason.find({ season: training.season });
  const squadIds = new Set(squad.map((e) => e.player.toString()));
  if (records.some((r) => !squadIds.has(r.player))) {
    return res.status(400).json({ error: "Hay jugadores que no son de la plantilla" });
  }

  // Comprobamos que no falte nadie por marcar
  const existing = await Attendance.find({ training: training._id });
  const existingIds = new Set(existing.map((a) => a.player.toString()));
  const providedIds = new Set(records.map((r) => r.player));
  const wasHeld = training.status === "held";

  const missing = squad
    .filter((e) => e.status !== "inactive")
    .map((e) => e.player.toString())
    .filter((id) => (wasHeld ? existingIds.has(id) : true))
    .filter((id) => !providedIds.has(id) && !existingIds.has(id));

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Faltan ${missing.length} jugadores por marcar`,
    });
  }

  // El guardado y el cambio de estado van juntos: o se hace todo o nada
  await mongoose.connection.transaction(async (session) => {
    await Attendance.bulkWrite(
      records.map((r) => ({
        updateOne: {
          filter: { training: training._id, player: r.player },
          update: { $set: { status: r.status } },
          upsert: true,
        },
      })),
      { session }
    );
    training.status = "held";
    await training.save({ session });
  });

  const summaries = await summariesFor([training._id]);
  return res.json({
    id: training.id,
    status: training.status,
    attendance: summaries.get(training.id) ?? emptySummary(),
  });
});

/**
 * DELETE /api/teams/:teamId/trainings/:trainingId
 * Borra el entreno y toda su asistencia.
 */
router.delete<TrainingParams>("/:trainingId", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) {
    return res.status(403).json({ error: "No tienes permiso para gestionar entrenos" });
  }

  const training = await findTraining(req.params.teamId, req.params.trainingId);
  if (!training) {
    return res.status(404).json({ error: "Entreno no encontrado" });
  }

  await mongoose.connection.transaction(async (session) => {
    await Attendance.deleteMany({ training: training._id }).session(session);
    await Training.deleteOne({ _id: training._id }).session(session);
  });

  return res.status(204).send();
});

export default router;
