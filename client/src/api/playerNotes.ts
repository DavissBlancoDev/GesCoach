import { api } from "./client";

// Nota del entrenador sobre un jugador, tal como la devuelve el servidor
export interface PlayerNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

const notesPath = (teamId: string, playerId: string) =>
  `/teams/${teamId}/players/${playerId}/notes`;

/** Notas de un jugador, de la más reciente a la más antigua. */
export const getPlayerNotes = (teamId: string, playerId: string) =>
  api<PlayerNote[]>(notesPath(teamId, playerId));

/** Añade una nota al jugador. */
export const createPlayerNote = (teamId: string, playerId: string, text: string) =>
  api<PlayerNote>(notesPath(teamId, playerId), {
    method: "POST",
    body: JSON.stringify({ text }),
  });

/** Cambia el texto de una nota. */
export const updatePlayerNote = (
  teamId: string,
  playerId: string,
  noteId: string,
  text: string
) =>
  api<PlayerNote>(`${notesPath(teamId, playerId)}/${noteId}`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });

/** Borra una nota. */
export const deletePlayerNote = (teamId: string, playerId: string, noteId: string) =>
  api<void>(`${notesPath(teamId, playerId)}/${noteId}`, { method: "DELETE" });
