import { Schema, model, Types } from "mongoose";

// Tipo de partido. Más adelante la liga se vinculará a su competición.
export const MATCH_COMPETITIONS = ["league", "cup", "tournament", "friendly"] as const;
// Sede desde nuestro punto de vista: en casa, fuera o en campo neutral
export const MATCH_VENUES = ["home", "away", "neutral"] as const;
// pending: pendiente · playing: jugando · finished: finalizado
export const MATCH_STATUSES = ["pending", "playing", "finished"] as const;

export type MatchCompetition = (typeof MATCH_COMPETITIONS)[number];
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// Un convocado y su papel en la alineación
interface ICallupEntry {
  player: Types.ObjectId;
  jerseyNumber?: number;
  starter: boolean;
}

interface IMatch {
  team: Types.ObjectId;
  season: Types.ObjectId;
  opponent: Types.ObjectId;
  competition: MatchCompetition;
  venue: (typeof MATCH_VENUES)[number];
  date: Date;
  time?: string;
  durationMinutes?: number;
  city?: string;
  fieldName?: string;
  observations?: string;
  status: MatchStatus;
  goalsFor?: number;
  goalsAgainst?: number;
  goalkeeper?: Types.ObjectId;
  callup: ICallupEntry[];
}

/**
 * Un convocado. Lleva su papel en la alineación (titular o suplente) y,
 * opcionalmente, el dorsal con el que juega ESTE partido. Ese dorsal solo se
 * guarda cuando es distinto del dorsal fijo del jugador, así que el dorsal
 * fijo no cambia nunca por un partido.
 */
const callupSchema = new Schema<ICallupEntry>(
  {
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    jerseyNumber: { type: Number, min: 0, max: 99 },
    starter: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Un partido. El resultado se guarda desde nuestro punto de vista (goles a
 * favor y en contra), sea cual sea la sede. La fecha se guarda a medianoche
 * UTC y la hora aparte, porque a menudo la federación confirma la hora más
 * tarde: sin hora, el partido queda "por confirmar".
 *
 * La duración se copia de la temporada al crear el partido, para que un
 * cambio posterior en los ajustes no altere los minutos de partidos antiguos.
 * El portero es el titular que empieza bajo los palos.
 */
const matchSchema = new Schema<IMatch>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    season: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    opponent: { type: Schema.Types.ObjectId, ref: "Opponent", required: true },
    competition: { type: String, enum: MATCH_COMPETITIONS, required: true },
    venue: { type: String, enum: MATCH_VENUES, required: true },
    date: { type: Date, required: true },
    time: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Formato esperado: HH:MM"] },
    durationMinutes: { type: Number, min: 10, max: 120 },
    city: { type: String, trim: true, maxlength: 80 },
    fieldName: { type: String, trim: true, maxlength: 120 },
    observations: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: MATCH_STATUSES, default: "pending" },
    goalsFor: { type: Number, min: 0, max: 99 },
    goalsAgainst: { type: Number, min: 0, max: 99 },
    goalkeeper: { type: Schema.Types.ObjectId, ref: "Player" },
    callup: { type: [callupSchema], default: [] },
  },
  { timestamps: true }
);

// Los partidos de una temporada se piden siempre ordenados por fecha
matchSchema.index({ season: 1, date: 1 });

export const Match = model<IMatch>("Match", matchSchema);
