import { Schema, model, Types } from "mongoose";

interface IOpponent {
  team: Types.ObjectId;
  name: string;
  normalizedName: string;
}

/**
 * Equipo rival. Es una entidad propia de cada equipo, reutilizable en todos
 * los partidos contra él. Más adelante tendrá escudo y nombres alternativos
 * (para reconocerlo al importar los PDF de la federación).
 *
 * normalizedName es el nombre sin tildes ni mayúsculas, y con el equipo forma
 * un índice único: así no se duplica un rival escrito de formas distintas.
 */
const opponentSchema = new Schema<IOpponent>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedName: { type: String, required: true },
  },
  { timestamps: true }
);

opponentSchema.index({ team: 1, normalizedName: 1 }, { unique: true });

export const Opponent = model<IOpponent>("Opponent", opponentSchema);
