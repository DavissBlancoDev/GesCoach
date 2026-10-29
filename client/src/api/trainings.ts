import { api } from "./client";
import type { PlayerStatus } from "./players";

// scheduled: programado · held: celebrado (ya se pasó lista) · cancelled: suspendido
export type TrainingStatus = "scheduled" | "held" | "cancelled";

// Los tres botones al pasar lista: verde, naranja y rojo
export type AttendanceStatus = "present" | "justified_absence" | "unjustified_absence";

// Recuento de asistencia de un entreno
export interface AttendanceSummary {
  present: number;
  justifiedAbsence: number;
  unjustifiedAbsence: number;
}

// Entreno tal como lo devuelve el servidor. El recuento solo llega si el
// rol puede ver estadísticas.
export interface Training {
  id: string;
  date: string; // fecha a medianoche UTC, en formato ISO
  startTime?: string; // "HH:MM"
  durationMinutes?: number;
  location?: string;
  objectives?: string;
  status: TrainingStatus;
  attendance?: AttendanceSummary;
}

// Un jugador en la lista de asistencia de un entreno
export interface TrainingPlayer {
  id: string;
  name: string;
  surname: string;
  nickname?: string;
  jerseyNumber?: number;
  playerStatus: PlayerStatus;
  attendance: AttendanceStatus | null; // null si aún no está marcado
}

// Un entreno con su lista de jugadores (la lista solo llega a quien puede ver estadísticas)
export interface TrainingDetail extends Training {
  players?: TrainingPlayer[];
}

// Datos que envía el formulario al crear o editar un entreno
export interface TrainingData {
  date: string; // AAAA-MM-DD
  startTime?: string;
  durationMinutes?: number;
  location?: string;
  objectives?: string;
}

// Un registro de asistencia que se envía al guardar la lista
export interface AttendanceRecord {
  player: string;
  status: AttendanceStatus;
}

const base = (teamId: string) => `/teams/${teamId}/trainings`;

/** Entrenos de la temporada actual, por orden de fecha. */
export const getTrainings = (teamId: string) => api<Training[]>(base(teamId));

/** Un entreno con la lista de jugadores y su asistencia. */
export const getTraining = (teamId: string, trainingId: string) =>
  api<TrainingDetail>(`${base(teamId)}/${trainingId}`);

/** Crea un entreno en la temporada actual. */
export const createTraining = (teamId: string, data: TrainingData) =>
  api<Training>(base(teamId), { method: "POST", body: JSON.stringify(data) });

/** Sustituye los datos de un entreno. */
export const updateTraining = (teamId: string, trainingId: string, data: TrainingData) =>
  api<Training>(`${base(teamId)}/${trainingId}`, { method: "PUT", body: JSON.stringify(data) });

/** Suspende un entreno o lo vuelve a programar. */
export const updateTrainingStatus = (
  teamId: string,
  trainingId: string,
  status: "scheduled" | "cancelled"
) =>
  api<{ id: string; status: TrainingStatus }>(`${base(teamId)}/${trainingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

/** Guarda la asistencia de los jugadores enviados y marca el entreno como celebrado. */
export const saveAttendance = (teamId: string, trainingId: string, records: AttendanceRecord[]) =>
  api<{ id: string; status: TrainingStatus; attendance: AttendanceSummary }>(
    `${base(teamId)}/${trainingId}/attendance`,
    { method: "PUT", body: JSON.stringify({ records }) }
  );

/** Borra un entreno y toda su asistencia. */
export const deleteTraining = (teamId: string, trainingId: string) =>
  api<void>(`${base(teamId)}/${trainingId}`, { method: "DELETE" });
