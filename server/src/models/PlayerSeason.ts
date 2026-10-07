import { Schema, model, Types } from "mongoose";
import { CATEGORIES } from "./Season";
import { POSITIONS } from "../lib/positions";

export const PLAYER_STATUSES = ["available", "injured", "suspended", "inactive"] as const;

interface IPlayerSeason {
  player: Types.ObjectId;
  season: Types.ObjectId;
  licenseCategory: (typeof CATEGORIES)[number];
  jerseyNumber?: number;
  mainPosition: (typeof POSITIONS)[number];
  secondaryPositions: (typeof POSITIONS)[number][];
  status: (typeof PLAYER_STATUSES)[number];
}

/**
 * Jugador dentro de la plantilla de una temporada. Al finalizar la
 * temporada estos documentos no se borran: quedan como histórico, y la
 * temporada nueva empieza con su propia plantilla.
 */
const playerSeasonSchema = new Schema<IPlayerSeason>(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    season: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    // Tipo de ficha en esa temporada (cambia cuando suben de categoría)
    licenseCategory: { type: String, enum: CATEGORIES, required: true },
    // Dorsal fijo y opcional. El cambio puntual de un partido irá en la convocatoria.
    jerseyNumber: { type: Number, min: 0, max: 99 },
    mainPosition: { type: String, enum: POSITIONS, required: true },
    secondaryPositions: { type: [{ type: String, enum: POSITIONS }], default: [] },
    status: { type: String, enum: PLAYER_STATUSES, default: "available" },
  },
  { timestamps: true }
);

// Un jugador solo puede aparecer una vez en la plantilla de cada temporada
playerSeasonSchema.index({ player: 1, season: 1 }, { unique: true });

// El dorsal no se puede repetir dentro de una temporada. El índice es
// parcial: solo cuenta los jugadores que tienen dorsal, porque varios
// pueden estar sin él.
playerSeasonSchema.index(
  { season: 1, jerseyNumber: 1 },
  { unique: true, partialFilterExpression: { jerseyNumber: { $type: "number" } } }
);

export const PlayerSeason = model<IPlayerSeason>("PlayerSeason", playerSeasonSchema);