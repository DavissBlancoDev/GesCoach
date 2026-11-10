import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { CalendarNote } from "../models/CalendarNote";
import { Season } from "../models/Season";
import type { Role } from "../models/Membership";
import { canManageTrainings } from "../lib/permissions";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireTeamMember);

type TeamParams = { teamId: string };
type NoteParams = TeamParams & { noteId: string };
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: AAAA-MM-DD").transform((v) => new Date(v));
const noteSchema = z.object({
  date: dateString,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato esperado: HH:MM").optional(),
  title: z.string().trim().min(1).max(120),
  details: z.string().trim().max(1000).optional(),
});

const toItem = (note: InstanceType<typeof CalendarNote>) => ({
  id: note.id,
  date: note.date,
  startTime: note.startTime,
  title: note.title,
  details: note.details,
});

router.get<TeamParams>("/", async (req, res) => {
  const season = await Season.findOne({ team: req.params.teamId, isCurrent: true });
  if (!season) return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  const notes = await CalendarNote.find({ team: req.params.teamId, season: season._id }).sort({ date: 1, startTime: 1 });
  return res.json(notes.map(toItem));
});

router.post<TeamParams>("/", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) return res.status(403).json({ error: "No tienes permiso para gestionar eventos" });
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos no válidos", details: parsed.error.flatten().fieldErrors });
  const season = await Season.findOne({ team: req.params.teamId, isCurrent: true });
  if (!season) return res.status(404).json({ error: "El equipo no tiene temporada activa" });
  const note = await CalendarNote.create({ ...parsed.data, team: new mongoose.Types.ObjectId(req.params.teamId), season: season._id });
  return res.status(201).json(toItem(note));
});

router.delete<NoteParams>("/:noteId", async (req, res) => {
  const role = res.locals.role as Role;
  if (!canManageTrainings(role)) return res.status(403).json({ error: "No tienes permiso para gestionar eventos" });
  if (!mongoose.isValidObjectId(req.params.noteId)) return res.status(404).json({ error: "Evento no encontrado" });
  const note = await CalendarNote.findOneAndDelete({ _id: req.params.noteId, team: req.params.teamId });
  if (!note) return res.status(404).json({ error: "Evento no encontrado" });
  return res.status(204).send();
});

export default router;
