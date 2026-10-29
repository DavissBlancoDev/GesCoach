import type { Role } from "../api/teams";
import type { AttendanceStatus, TrainingStatus } from "../api/trainings";

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  scheduled: "Programado",
  held: "Celebrado",
  cancelled: "Suspendido",
};

export const TRAINING_STATUS_COLORS: Record<TrainingStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  held: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

// Los tres botones de pasar lista. Llevan texto además de color, para que se
// distingan bien al aire libre y por personas con daltonismo.
export interface AttendanceOption {
  value: AttendanceStatus;
  label: string;
  activeClass: string; // botón elegido
  idleClass: string; // botón sin elegir (con un toque del color, para reconocerlo)
}

export const ATTENDANCE_OPTIONS: AttendanceOption[] = [
  {
    value: "present",
    label: "Asiste",
    activeClass: "border-green-700 bg-green-700 text-white",
    idleClass: "border-green-300 bg-white text-green-800",
  },
  {
    value: "justified_absence",
    label: "Justificada",
    activeClass: "border-orange-500 bg-orange-500 text-white",
    idleClass: "border-orange-300 bg-white text-orange-800",
  },
  {
    value: "unjustified_absence",
    label: "Sin justificar",
    activeClass: "border-red-700 bg-red-700 text-white",
    idleClass: "border-red-300 bg-white text-red-800",
  },
];

// Solo para mostrar u ocultar botones. La protección real está en el
// servidor (server/src/lib/permissions.ts).
export const canManageTrainings = (role: Role) =>
  role === "head_coach" || role === "assistant_coach";

/** Fecha de hoy, en la zona horaria del navegador, como AAAA-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Fecha de un entreno en texto largo ("Martes, 13 de octubre de 2026"). Se usa
 * UTC porque las fechas se guardan a medianoche UTC.
 */
export function formatTrainingDate(iso: string): string {
  const text = new Date(iso).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Hora y duración en una línea: "19:00 · 90 min". Vacía si no hay ninguna. */
export function formatTrainingTime(training: {
  startTime?: string;
  durationMinutes?: number;
}): string {
  const parts: string[] = [];
  if (training.startTime) parts.push(training.startTime);
  if (training.durationMinutes) parts.push(`${training.durationMinutes} min`);
  return parts.join(" · ");
}
