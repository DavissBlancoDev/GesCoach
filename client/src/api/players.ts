import { api } from "./client";
import type { Category } from "./teams";
import type { Position } from "../lib/positions";

export type PlayerStatus = "available" | "injured" | "suspended" | "inactive";

export interface Guardian {
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
}

export interface Contract {
  startDate?: string;
  endDate: string;
  salary?: number;
  salaryPeriod?: "monthly" | "yearly";
}

// Jugador de la plantilla, tal como lo devuelve el servidor.
// Los campos guardians y contract solo llegan si el rol tiene permiso
// para verlos, por eso son opcionales.
export interface SquadPlayer {
  id: string;
  squadId: string;
  name: string;
  surname: string;
  nickname?: string;
  birthDate: string;
  age: number;
  nationality?: string;
  licenseCategory: Category;
  jerseyNumber?: number;
  mainPosition: Position;
  secondaryPositions: Position[];
  status: PlayerStatus;
  guardians?: Guardian[];
  contract?: Contract & { yearsLeft: number }
  stats?: PlayerStats; // solo llega si el rol puede ver estadísticas;
}

// Datos que envía el formulario al añadir un jugador
export interface CreatePlayerData {
  name: string;
  surname: string;
  nickname?: string;
  birthDate: string; // AAAA-MM-DD
  nationality?: string;
  guardians: Guardian[];
  contract?: Contract;
  licenseCategory: Category;
  jerseyNumber?: number;
  mainPosition: Position;
  secondaryPositions: Position[];
  status: PlayerStatus;
}

/** Plantilla de la temporada actual del equipo. */
export const getPlayers = (teamId: string) =>
  api<SquadPlayer[]>(`/teams/${teamId}/players`);

/** Crea un jugador y lo añade a la plantilla de la temporada actual. */
export const createPlayer = (teamId: string, data: CreatePlayerData) =>
  api<SquadPlayer>(`/teams/${teamId}/players`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  // Estadísticas de un jugador en la temporada. Se calculan en el servidor
// a partir de los partidos. Llegan vacías de momento.
export interface PlayerStats {
  calledUp: number; // partidos convocado
  played: number; // partidos jugados
  started: number; // partidos como titular
  minutes: number; // minutos jugados
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number; // porterías a cero (solo porteros)
  goalsConceded: number; // goles encajados (solo porteros)
}

/** Quita un jugador de la plantilla de la temporada actual. */
export const deletePlayer = (teamId: string, playerId: string) =>
  api<void>(`/teams/${teamId}/players/${playerId}`, { method: "DELETE" });