import type { Role } from "../models/Membership";
import { PLAYER_STATUSES } from "../models/PlayerSeason";

type PlayerStatus = (typeof PLAYER_STATUSES)[number];

/** Quién puede crear y editar jugadores de la plantilla. */
export const canEditSquad = (role: Role) =>
  role === "head_coach" || role === "assistant_coach";

/** Contrato y sueldo: el dato más sensible, solo el entrenador principal. */
export const canSeeContract = (role: Role) => role === "head_coach";

/** Contacto de tutores: cuerpo técnico y delegado (por urgencias en partido). */
export const canSeeGuardians = (role: Role) =>
  role === "head_coach" || role === "assistant_coach" || role === "delegate";

/** Estadísticas: todos los roles menos el médico. */
export const canSeeStats = (role: Role) => role !== "medical";

/**
 * Cambiar el estado de un jugador. El entrenador principal y el segundo
 * entrenador pueden asignar cualquiera. El médico solo alterna entre
 * "disponible" y "lesionado", para no pisar sanciones ni bajas decididas
 * por el cuerpo técnico.
 */
export const canSetStatus = (role: Role, from: PlayerStatus, to: PlayerStatus) => {
  if (role === "head_coach" || role === "assistant_coach") return true;
  if (role === "medical") {
    const medicalStates: PlayerStatus[] = ["available", "injured"];
    return medicalStates.includes(from) && medicalStates.includes(to);
  }
  return false;
};

/**
 * Notas del entrenador sobre los jugadores: solo el entrenador principal.
 * Pueden contener datos personales de menores, por eso no se comparten ni
 * con el segundo entrenador.
 */
export const canManageNotes = (role: Role) => role === "head_coach";
