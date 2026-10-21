import { Schema, model, Types } from "mongoose";

interface IPlayerNote {
  team: Types.ObjectId;
  player: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  // Los rellena Mongoose solos (timestamps), por eso son opcionales aquí
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Nota del entrenador sobre un jugador. Cada nota es una entrada con fecha,
 * y no un único campo de texto, para ver la evolución y poder borrar solo
 * una.
 *
 * Va ligada al jugador como persona (no a la temporada), así el seguimiento
 * se conserva si continúa al año siguiente. Se guarda también el equipo para
 * poder filtrar siempre por él y no mezclar notas de equipos distintos.
 *
 * Son datos sensibles: solo las gestiona el entrenador principal (ver
 * canManageNotes en lib/permissions.ts).
 */
const playerNoteSchema = new Schema<IPlayerNote>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// Las notas de un jugador se piden siempre de la más reciente a la más antigua
playerNoteSchema.index({ player: 1, createdAt: -1 });

export const PlayerNote = model<IPlayerNote>("PlayerNote", playerNoteSchema);
