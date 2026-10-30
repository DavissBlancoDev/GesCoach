import { api } from "./client";

export type MatchCompetition = "league" | "cup" | "tournament" | "friendly";
// Sede desde nuestro punto de vista
export type MatchVenue = "home" | "away" | "neutral";
export type MatchStatus = "pending" | "playing" | "finished";
export type MatchResult = "win" | "draw" | "loss";

export interface Opponent {
  id: string;
  name: string;
}

// Partido tal como lo devuelve el servidor. El resultado va desde nuestro
// punto de vista, sea cual sea la sede. La convocatoria solo llega a los
// roles que pueden verla.
export interface Match {
  id: string;
  competition: MatchCompetition;
  venue: MatchVenue;
  opponent: Opponent;
  date: string; // fecha a medianoche UTC, en formato ISO
  time?: string; // "HH:MM". Sin hora, el partido queda "por confirmar"
  city?: string;
  fieldName?: string;
  observations?: string;
  status: MatchStatus;
  goalsFor?: number;
  goalsAgainst?: number;
  result?: MatchResult; // solo en partidos finalizados
  maxCallup: number | null; // null = sin límite
  callup?: string[]; // identificadores de los jugadores convocados
}

// Datos que envía el formulario al programar o editar un partido
export interface MatchData {
  competition: MatchCompetition;
  venue: MatchVenue;
  opponentName: string;
  date: string; // AAAA-MM-DD
  time?: string;
  city?: string;
  fieldName?: string;
  observations?: string;
}

const base = (teamId: string) => `/teams/${teamId}/matches`;

/** Partidos de la temporada actual, por orden de fecha. */
export const getMatches = (teamId: string) => api<Match[]>(base(teamId));

/** Rivales ya usados, para sugerirlos al escribir el nombre. */
export const getOpponents = (teamId: string) => api<Opponent[]>(`${base(teamId)}/opponents`);

/** Programa un partido. */
export const createMatch = (teamId: string, data: MatchData) =>
  api<Match>(base(teamId), { method: "POST", body: JSON.stringify(data) });

/** Sustituye los datos de un partido (no su estado, resultado ni convocatoria). */
export const updateMatch = (teamId: string, matchId: string, data: MatchData) =>
  api<Match>(`${base(teamId)}/${matchId}`, { method: "PUT", body: JSON.stringify(data) });

/** Cambia el estado: pendiente, jugando o finalizado. */
export const updateMatchStatus = (teamId: string, matchId: string, status: MatchStatus) =>
  api<{
    id: string;
    status: MatchStatus;
    goalsFor?: number;
    goalsAgainst?: number;
    result?: MatchResult;
  }>(`${base(teamId)}/${matchId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

/** Cambia el resultado. Solo mientras el partido está en juego. */
export const updateMatchScore = (
  teamId: string,
  matchId: string,
  goalsFor: number,
  goalsAgainst: number
) =>
  api<{ id: string; goalsFor: number; goalsAgainst: number }>(`${base(teamId)}/${matchId}/score`, {
    method: "PATCH",
    body: JSON.stringify({ goalsFor, goalsAgainst }),
  });

/** Sustituye la convocatoria por la lista de jugadores enviada. */
export const saveCallup = (teamId: string, matchId: string, players: string[]) =>
  api<{ id: string; callup: string[] }>(`${base(teamId)}/${matchId}/callup`, {
    method: "PUT",
    body: JSON.stringify({ players }),
  });

/** Borra un partido. */
export const deleteMatch = (teamId: string, matchId: string) =>
  api<void>(`${base(teamId)}/${matchId}`, { method: "DELETE" });
