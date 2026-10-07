import { api } from "./client";

export type Modality = "f7" | "f8" | "f11";
export type Category =
  | "prebenjamin"
  | "benjamin"
  | "alevin"
  | "infantil"
  | "cadete"
  | "juvenil"
  | "senior"
  | "veteranos";
export type Role =
  | "head_coach"
  | "assistant_coach"
  | "delegate"
  | "team_manager"
  | "medical";

// Los documentos de Mongo llegan con "_id", no con "id"
export interface Team {
  _id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fieldName: string;
  fieldLocation?: string;
  badgeUrl?: string;
}

export interface Season {
  _id: string;
  team: string;
  startYear: number;
  category: Category;
  modality: Modality;
  division: string;
  matchDuration: number;
  isCurrent: boolean;
}

// Un equipo del usuario, con su rol y su temporada actual
export interface MyTeam {
  role: Role;
  team: Team | null;
  currentSeason: Season | null;
}

// Lo que envía el asistente al crear un equipo
export interface CreateTeamData {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fieldName: string;
  fieldLocation?: string;
  season: {
    startYear: number;
    category: Category;
    modality: Modality;
    division: string;
    matchDuration: number;
  };
}

/** Equipos a los que pertenece el usuario con sesión iniciada. */
export const getMyTeams = () => api<MyTeam[]>("/teams/mine");

/** Crea el equipo, su primera temporada y la membresía de entrenador principal. */
export const createTeam = (data: CreateTeamData) =>
  api<{ team: Team; season: Season }>("/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });