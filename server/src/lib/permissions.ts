import type { Role } from "../models/Membership";

/** Quién puede crear y editar jugadores de la plantilla. */
export const canEditSquad = (role: Role) =>
  role === "head_coach" || role === "assistant_coach";

/** Contrato y sueldo: el dato más sensible, solo el entrenador principal. */
export const canSeeContract = (role: Role) => role === "head_coach";

/** Contacto de tutores: cuerpo técnico y delegado (por urgencias en partido). */
export const canSeeGuardians = (role: Role) =>
  role === "head_coach" || role === "assistant_coach" || role === "delegate";