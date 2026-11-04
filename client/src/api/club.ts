import { api } from "./client";
import type { Category, Modality, Role } from "./teams";

// Miembro de un equipo con su rol. El correo solo llega al entrenador principal.
export interface Member {
  id: string;
  name: string;
  surname: string;
  role: Role;
  email?: string;
  isYou: boolean;
}

// Lo que se puede cambiar del equipo. Una cadena vacía en el país y la
// localidad borra el valor.
export interface TeamChanges {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  country?: string;
  fieldName?: string;
  fieldLocation?: string; // la localidad del campo
}

// Lo que se puede cambiar de la temporada actual
export interface SeasonChanges {
  category?: Category;
  modality?: Modality;
  startYear?: number;
  matchDuration?: number;
  division?: string; // el nombre de la liga
}

/** Cambia los ajustes del equipo (solo el entrenador principal). */
export const updateTeam = (teamId: string, data: TeamChanges) =>
  api<unknown>(`/teams/${teamId}/club`, { method: "PATCH", body: JSON.stringify(data) });

/** Cambia los datos de la temporada actual (solo el entrenador principal). */
export const updateSeason = (teamId: string, data: SeasonChanges) =>
  api<unknown>(`/teams/${teamId}/season`, { method: "PATCH", body: JSON.stringify(data) });

/** Miembros del equipo con su rol. */
export const getMembers = (teamId: string) => api<Member[]>(`/teams/${teamId}/club/members`);
