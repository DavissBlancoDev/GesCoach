import { Schema, model } from "mongoose";

export const MODALITIES = ["f7", "f8", "f11"] as const; // Modalidades de juego: fútbol 7, 8 u 11

// Categorías de fútbol base. Se guardan como clave sin tildes; el nombre
// para mostrar ("Alevín", "Benjamín"...) lo pone el cliente.
// Conviene comprobar la lista exacta con la federación.
export const CATEGORIES = [
  "prebenjamin",
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "senior",
  "veteranos"
] as const;

/**
 * Temporada de un equipo. Aquí viven los datos que cambian cada año,
 * para conservar el historial cuando el equipo sube de categoría.
 */
const seasonSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    
    // El texto se calcula al mostrarlo, así se puede ordenar y comparar.
    startYear: { type: Number, required: true, min: 2000, max: 2100 }, // Año de inicio como número: 2026 significa la temporada "2026/2027".
    category: { type: String, enum: CATEGORIES, required: true },
    modality: { type: String, enum: MODALITIES, required: true },
    division: { type: String, required: true, trim: true, maxlength: 120 }, // Texto libre, porque cambia según la federación y el grupo
    matchDuration: { type: Number, required: true, min: 10, max: 120 }, // Duración total del partido, en minutos
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Un equipo solo puede tener una temporada marcada como actual
seasonSchema.index(
  { team: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } }
);

export const Season = model("Season", seasonSchema);