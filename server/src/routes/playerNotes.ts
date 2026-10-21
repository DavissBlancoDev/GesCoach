import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { Player } from "../models/Player";
import { PlayerNote } from "../models/PlayerNote";
import type { Role } from "../models/Membership";
import { canManageNotes } from "../lib/permissions";

// mergeParams permite leer :teamId y :playerId, que vienen de index.ts
const router = Router({ mergeParams: true });

// Todas las rutas exigen sesión y pertenecer al equipo...
router.use(requireAuth, requireTeamMember);

// ...y, además, permiso sobre las notas (solo el entrenador principal)
router.use((_req, res, next) => {
  if (!canManageNotes(res.locals.role as Role)) {
    return res.status(403).json({ error: "No tienes permiso para ver las notas" });
  }
  return next();
});

type PlayerParams = { teamId: string; playerId: string };
type NoteParams = PlayerParams & { noteId: string };

// Contenido de una nota
const noteSchema = z.object({ text: z.string().trim().min(1).max(2000) });

/** Comprueba que el jugador existe y pertenece a este equipo. */
async function playerExists(teamId: string, playerId: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(playerId)) return false;
  return Boolean(await Player.exists({ _id: playerId, team: teamId }));
}

type NoteDoc = InstanceType<typeof PlayerNote>;

/** Convierte una nota en el objeto que se envía al cliente. */
const toNoteItem = (note: NoteDoc) => ({
  id: note.id,
  text: note.text,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

/**
 * GET /api/teams/:teamId/players/:playerId/notes
 * Notas del jugador, de la más reciente a la más antigua.
 */
router.get<PlayerParams>("/", async (req, res) => {
  const { teamId, playerId } = req.params;
  if (!(await playerExists(teamId, playerId))) {
    return res.status(404).json({ error: "Jugador no encontrado" });
  }

  const notes = await PlayerNote.find({ player: playerId, team: teamId }).sort({ createdAt: -1 });
  return res.json(notes.map(toNoteItem));
});

/**
 * POST /api/teams/:teamId/players/:playerId/notes
 * Añade una nota al jugador. Se guarda quién la escribió.
 */
router.post<PlayerParams>("/", async (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { teamId, playerId } = req.params;
  if (!(await playerExists(teamId, playerId))) {
    return res.status(404).json({ error: "Jugador no encontrado" });
  }

  const note = await PlayerNote.create({
    team: new mongoose.Types.ObjectId(teamId),
    player: new mongoose.Types.ObjectId(playerId),
    author: new mongoose.Types.ObjectId(res.locals.userId as string),
    text: parsed.data.text,
  });

  return res.status(201).json(toNoteItem(note));
});

/**
 * PUT /api/teams/:teamId/players/:playerId/notes/:noteId
 * Cambia el texto de una nota. Se filtra también por jugador y equipo, para
 * que no se pueda tocar una nota de otro.
 */
router.put<NoteParams>("/:noteId", async (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Datos no válidos",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { teamId, playerId, noteId } = req.params;
  if (!mongoose.isValidObjectId(noteId)) {
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  const note = await PlayerNote.findOneAndUpdate(
    { _id: noteId, player: playerId, team: teamId },
    { text: parsed.data.text },
    { new: true }
  );
  if (!note) {
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  return res.json(toNoteItem(note));
});

/**
 * DELETE /api/teams/:teamId/players/:playerId/notes/:noteId
 * Borra una nota.
 */
router.delete<NoteParams>("/:noteId", async (req, res) => {
  const { teamId, playerId, noteId } = req.params;
  if (!mongoose.isValidObjectId(noteId)) {
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  const result = await PlayerNote.deleteOne({ _id: noteId, player: playerId, team: teamId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Nota no encontrada" });
  }

  return res.status(204).send();
});

export default router;
