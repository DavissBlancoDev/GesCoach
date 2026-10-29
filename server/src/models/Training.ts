import { Schema, model, Types } from "mongoose";

// scheduled: programado · held: celebrado (ya se pasó lista) · cancelled: suspendido
export const TRAINING_STATUSES = ["scheduled", "held", "cancelled"] as const;

interface ITraining {
  team: Types.ObjectId;
  season: Types.ObjectId;
  date: Date;
  startTime?: string;
  durationMinutes?: number;
  location?: string;
  objectives?: string;
  status: (typeof TRAINING_STATUSES)[number];
}

/**
 * Un entreno de una temporada. La fecha se guarda a medianoche UTC (igual
 * que las fechas de nacimiento) y la hora aparte, como texto "HH:MM".
 * Los entrenos suspendidos no cuentan para los porcentajes de asistencia.
 */
const trainingSchema = new Schema<ITraining>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    season: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Formato esperado: HH:MM"] },
    durationMinutes: { type: Number, min: 10, max: 240 },
    location: { type: String, trim: true, maxlength: 120 },
    objectives: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: TRAINING_STATUSES, default: "scheduled" },
  },
  { timestamps: true }
);

// Los entrenos de una temporada se piden siempre ordenados por fecha
trainingSchema.index({ season: 1, date: 1 });

export const Training = model<ITraining>("Training", trainingSchema);
