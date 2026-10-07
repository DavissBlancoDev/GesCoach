import { Schema, model } from "mongoose";

/**
 * Equipo: la entidad continua que sobrevive entre temporadas.
 * Los datos que cambian cada año (categoría, división, modalidad...)
 * van en Season, no aquí.
 */
const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Colores en formato hexadecimal, por ejemplo "#1d4ed8"
    primaryColor: { type: String, required: true },
    secondaryColor: { type: String, required: true },
    // Campo local: de momento texto simple, sin entidad propia
    fieldName: { type: String, required: true, trim: true, maxlength: 120 },
    fieldLocation: { type: String, trim: true, maxlength: 200 },
    // Dirección de la imagen del escudo (nunca el archivo en sí).
    // Se rellenará cuando añadamos la subida de archivos.
    badgeUrl: { type: String, trim: true },
    // Usuario que creó el equipo
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Team = model("Team", teamSchema);