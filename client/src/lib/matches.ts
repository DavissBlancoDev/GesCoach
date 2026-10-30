import type { Role } from "../api/teams";
import type {
  Match,
  MatchCompetition,
  MatchResult,
  MatchStatus,
  MatchVenue,
} from "../api/matches";

export const COMPETITION_LABELS: Record<MatchCompetition, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

export const VENUE_LABELS: Record<MatchVenue, string> = {
  home: "En casa",
  away: "Fuera",
  neutral: "Campo neutral",
};

// Emoji de la sede: casa, fuera y campo neutral
export const VENUE_ICONS: Record<MatchVenue, string> = {
  home: "🏠",
  away: "🚌",
  neutral: "🏟️",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: "Pendiente",
  playing: "Jugando",
  finished: "Finalizado",
};

export const MATCH_STATUS_COLORS: Record<MatchStatus, string> = {
  pending: "bg-blue-100 text-blue-800",
  playing: "bg-green-100 text-green-800",
  finished: "bg-gray-200 text-gray-700",
};

// Color de la casilla según el resultado. Lleva también una letra, para que
// no dependa solo del color: V (victoria), E (empate) y D (derrota).
export const RESULT_STYLES: Record<MatchResult, { box: string; letter: string; label: string }> = {
  win: { box: "border-green-300 bg-green-100", letter: "V", label: "Victoria" },
  draw: { box: "border-amber-300 bg-amber-100", letter: "E", label: "Empate" },
  loss: { box: "border-red-300 bg-red-100", letter: "D", label: "Derrota" },
};

// Solo para mostrar u ocultar botones. La protección real está en el
// servidor (server/src/lib/permissions.ts).
export const canManageMatches = (role: Role) =>
  role === "head_coach" || role === "assistant_coach";
export const canRecordMatch = (role: Role) =>
  role === "head_coach" || role === "assistant_coach" || role === "delegate";
export const canEditCallup = (role: Role) => role === "head_coach";

/** Fecha en texto largo ("Sábado, 7 de noviembre de 2026"). Se usa UTC porque se guarda a medianoche UTC. */
export function formatMatchDate(iso: string): string {
  const text = new Date(iso).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Fecha corta ("7 nov 2026"), para listados. */
export const formatMatchDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Hora del partido, o "Hora por confirmar" si todavía no se sabe. */
export const matchTimeLabel = (match: Pick<Match, "time">) => match.time ?? "Hora por confirmar";

/**
 * Los dos lados del partido en el orden en que se anuncian: en casa y en
 * campo neutral va primero nuestro equipo, y fuera va primero el rival.
 */
export function sidesOf(match: Match, teamName: string) {
  const us = { name: teamName, goals: match.goalsFor };
  const them = { name: match.opponent.name, goals: match.goalsAgainst };
  return match.venue === "away" ? { left: them, right: us } : { left: us, right: them };
}

/** Orden por fecha y hora, del más antiguo al más reciente. */
export const byDateAsc = (a: Match, b: Match) =>
  (a.date.slice(0, 10) + (a.time ?? "")).localeCompare(b.date.slice(0, 10) + (b.time ?? ""));

/**
 * Próximo partido: el que se está jugando o, si no hay ninguno, el pendiente
 * más cercano en el tiempo (aunque su fecha ya haya pasado, para no perderlo
 * de vista).
 */
export function nextMatch(matches: Match[]): Match | undefined {
  const playing = matches.find((m) => m.status === "playing");
  if (playing) return playing;
  return matches.filter((m) => m.status === "pending").sort(byDateAsc)[0];
}

/** Partidos finalizados, del más reciente al más antiguo. */
export const finishedNewestFirst = (matches: Match[]) =>
  matches
    .filter((m) => m.status === "finished")
    .sort(byDateAsc)
    .reverse();
