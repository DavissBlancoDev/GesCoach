import type { Role } from "../api/teams";
import type { PlayerStatus } from "../api/players";

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  available: "Disponible",
  injured: "Lesionado",
  suspended: "Sancionado",
  inactive: "Inactivo",
};

// Lista de estados en el orden en que se muestran los botones de cambio
export const PLAYER_STATUS_LIST = Object.keys(PLAYER_STATUS_LABELS) as PlayerStatus[];

export const PLAYER_STATUS_COLORS: Record<PlayerStatus, string> = {
  available: "bg-green-100 text-green-800",
  injured: "bg-orange-100 text-orange-800",
  suspended: "bg-red-100 text-red-800",
  inactive: "bg-gray-200 text-gray-700",
};

// IMPORTANTE: estas comprobaciones solo sirven para mostrar u ocultar
// botones. La protección real está en el servidor
// (server/src/lib/permissions.ts), que es quien decide qué datos se
// envían y qué acciones se permiten.
export const canEditSquad = (role: Role) =>
  role === "head_coach" || role === "assistant_coach";

export const canEditContract = (role: Role) => role === "head_coach";

// Solo para mostrar u ocultar columnas. El servidor es quien decide si
// envía las estadísticas.
export const canSeeStats = (role: Role) => role !== "medical";

/**
 * Cambiar el estado de un jugador. El entrenador principal y el segundo
 * entrenador pueden asignar cualquiera. El médico solo alterna entre
 * disponible y lesionado. Debe coincidir con el servidor.
 */
export function canSetStatus(role: Role, from: PlayerStatus, to: PlayerStatus) {
  if (role === "head_coach" || role === "assistant_coach") return true;
  if (role === "medical") {
    const medicalStates: PlayerStatus[] = ["available", "injured"];
    return medicalStates.includes(from) && medicalStates.includes(to);
  }
  return false;
}
