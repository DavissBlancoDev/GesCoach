import { Schema, model } from "mongoose";

// Roles dentro de un equipo
export const ROLES = [
  "head_coach", // entrenador principal
  "assistant_coach", // segundo entrenador
  "delegate", // delegado que acompaña al equipo en los partidos
  "team_manager", // responsable del equipo (director de cantera, directivo)
  "medical", // médico
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Relaciona un usuario con un equipo y le asigna un rol.
 * El rol vive aquí y no en User, porque la misma persona puede tener
 * roles distintos en equipos distintos.
 */
const membershipSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true }
);

// Un usuario solo puede tener una membresía por equipo
membershipSchema.index({ user: 1, team: 1 }, { unique: true });

// Cada equipo tiene un único entrenador principal
membershipSchema.index(
  { team: 1 },
  { unique: true, partialFilterExpression: { role: "head_coach" } }
);

export const Membership = model("Membership", membershipSchema);