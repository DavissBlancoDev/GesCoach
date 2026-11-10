import { api } from "./client";

export type MatchCompetition = "league" | "cup" | "tournament" | "friendly";
// Sede desde nuestro punto de vista
export type MatchVenue = "home" | "away" | "neutral";
export type MatchStatus = "pending" | "playing" | "finished";
export type MatchResult = "win" | "draw" | "loss";
export type MatchEventType = "goal" | "yellow_card" | "red_card" | "substitution";
export type MatchEventSide = "for" | "against";

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  side?: MatchEventSide;
  player?: string;
  assist?: string;
  playerIn?: string;
  playerOut?: string;
  opponentJerseyNumber?: number;
  penalty: boolean;
  ownGoal: boolean;
}

export interface Opponent {
  id: string;
  name: string;
}

// Un convocado y su papel en la alineación
export interface LineupPlayer {
  player: string; // identificador del jugador
  starter: boolean;
  jerseyNumber?: number; // dorsal de ESTE partido, si es distinto del fijo
}

// Alineación de un partido. Solo llega a los roles que ven la convocatoria.
export interface Lineup {
  startersRequired: number; // titulares que marca la modalidad (7, 8 u 11)
  players: LineupPlayer[];
  goalkeeper?: string; // identificador del portero
  problems: string[]; // lo que falta para empezar el partido (vacío = completa)
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
  durationMinutes: number;
  city?: string;
  fieldName?: string;
  observations?: string;
  status: MatchStatus;
  goalsFor?: number;
  goalsAgainst?: number;
  result?: MatchResult; // solo en partidos finalizados
  maxCallup: number | null; // null = sin límite
  callup?: string[]; // identificadores de los jugadores convocados
  lineup?: Lineup;
  events?: MatchEvent[];
}

// Datos que envía el formulario al programar o editar un partido
export interface MatchData {
  competition: MatchCompetition;
  venue: MatchVenue;
  opponentName: string;
  durationMinutes?: number;
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
  api<{ id: string; callup: string[]; removedStarters: number }>(`${base(teamId)}/${matchId}/callup`, {
    method: "PUT",
    body: JSON.stringify({ players }),
  });

/** Borra un partido. */
export const deleteMatch = (teamId: string, matchId: string) =>
  api<void>(`${base(teamId)}/${matchId}`, { method: "DELETE" });

// Lo que se envía al guardar la alineación: un elemento por cada convocado
export interface LineupData {
  players: { player: string; starter: boolean; jerseyNumber?: number }[];
  goalkeeper: string | null;
}

/** Guarda la alineación: titulares, portero y dorsal de este partido de cada convocado. */
export const saveLineup = (teamId: string, matchId: string, data: LineupData) =>
  api<Match>(`${base(teamId)}/${matchId}/lineup`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export interface MatchEventData {
  type: MatchEventType;
  minute: number;
  side?: MatchEventSide;
  player?: string;
  assist?: string;
  playerIn?: string;
  playerOut?: string;
  opponentJerseyNumber?: number;
  penalty?: boolean;
  ownGoal?: boolean;
}

/** Añade un evento al acta del partido. */
export const addMatchEvent = (teamId: string, matchId: string, data: MatchEventData) =>
  api<{ id: string }>(`${base(teamId)}/${matchId}/events`, {
    method: "POST",
    body: JSON.stringify(data),
  });

/** Elimina un evento del acta. */
export const deleteMatchEvent = (teamId: string, matchId: string, eventId: string) =>
  api<void>(`${base(teamId)}/${matchId}/events/${eventId}`, { method: "DELETE" });
