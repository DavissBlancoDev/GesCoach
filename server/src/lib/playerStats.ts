import type { Types } from "mongoose";
import { Match } from "../models/Match";

/**
 * Estadísticas de un jugador en una temporada.
 * No se guardan en la ficha del jugador: se calculan a partir de las
 * convocatorias, alineaciones y actas de los partidos.
 */
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

/** Estadísticas de un jugador que todavía no tiene partidos: todo a cero. */
export const emptyStats = (): PlayerStats => ({
  calledUp: 0,
  played: 0,
  started: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  cleanSheets: 0,
  goalsConceded: 0,
});

/**
 * Calcula la participación de un jugador a partir de todos sus intervalos
 * en el campo. Es importante no quedarse con el primer entra/sale: en las
 * competiciones con cambios ilimitados un jugador puede volver a entrar.
 */
function playerParticipation(
  events: Array<{
    type: string;
    minute: number;
    playerIn?: { toString(): string };
    playerOut?: { toString(): string };
  }>,
  playerId: string,
  starter: boolean,
  duration: number
): { played: boolean; minutes: number } {
  let active = starter;
  let intervalStart = starter ? 0 : undefined;
  let minutes = 0;
  let appeared = starter;

  // El orden del acta se conserva cuando dos cambios tienen el mismo minuto.
  const substitutions = events
    .filter((event) => event.type === "substitution")
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index);

  for (const { event } of substitutions) {
    const minute = Math.max(0, Math.min(duration, event.minute));
    if (event.playerOut?.toString() === playerId && active) {
      minutes += Math.max(0, minute - (intervalStart ?? minute));
      active = false;
      intervalStart = undefined;
    }
    if (event.playerIn?.toString() === playerId && !active) {
      active = true;
      intervalStart = minute;
      appeared = true;
    }
  }

  if (active) minutes += Math.max(0, duration - (intervalStart ?? duration));
  return { played: appeared, minutes };
}

/**
 * Estadísticas de cada jugador de una temporada.
 * Devuelve un Map: identificador del jugador -> sus estadísticas.
 *
 * De momento no existen partidos, así que devuelve un Map vacío y quien
 * llama usa emptyStats() para cada jugador. Cuando existan convocatorias
 * y actas, el cálculo se hará aquí y el resto de la aplicación no cambia.
 */
export async function getSeasonStats(
  seasonId: Types.ObjectId,
  playerIds: string[]
): Promise<Map<string, PlayerStats>> {
  const result = new Map<string, PlayerStats>();
  if (playerIds.length === 0) return result;

  const requested = new Set(playerIds);
  const matches = await Match.find({
    season: seasonId,
    status: { $in: ["playing", "finished"] },
  }).lean();

  for (const match of matches) {
    const callup = match.callup ?? [];
    const calledIds = new Set(callup.map((entry) => entry.player.toString()));
    const starters = new Set(
      callup.filter((entry) => entry.starter).map((entry) => entry.player.toString())
    );
    for (const playerId of calledIds) {
      if (!requested.has(playerId)) continue;
      const stats = result.get(playerId) ?? emptyStats();
      stats.calledUp += 1;
      if (starters.has(playerId)) stats.started += 1;

      const participation = playerParticipation(
        match.events ?? [],
        playerId,
        starters.has(playerId),
        match.durationMinutes ?? 90
      );
      if (participation.played) stats.played += 1;
      stats.minutes += participation.minutes;

      for (const event of match.events ?? []) {
        if (event.type === "goal" && event.side === "for" && !event.ownGoal) {
          if (event.player?.toString() === playerId) stats.goals += 1;
          if (event.assist?.toString() === playerId) stats.assists += 1;
        }
        if (event.type === "yellow_card" && event.player?.toString() === playerId) {
          stats.yellowCards += 1;
        }
        if (event.type === "red_card" && event.player?.toString() === playerId) {
          stats.redCards += 1;
        }
      }

      if (match.goalkeeper?.toString() === playerId && match.status === "finished") {
        if ((match.goalsAgainst ?? 0) === 0) stats.cleanSheets += 1;
        stats.goalsConceded += match.goalsAgainst ?? 0;
      }
      result.set(playerId, stats);
    }
  }

  return result;
}
