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
    const substitutionsIn = new Set(
      (match.events ?? [])
        .filter((event) => event.type === "substitution" && event.playerIn)
        .map((event) => event.playerIn!.toString())
    );

    for (const playerId of calledIds) {
      if (!requested.has(playerId)) continue;
      const stats = result.get(playerId) ?? emptyStats();
      stats.calledUp += 1;
      if (starters.has(playerId)) stats.started += 1;

      if (starters.has(playerId) || substitutionsIn.has(playerId)) {
        stats.played += 1;
        const duration = match.durationMinutes ?? 90;
        const outgoing = (match.events ?? [])
          .filter((event) => event.type === "substitution" && event.playerOut?.toString() === playerId)
          .sort((a, b) => a.minute - b.minute)[0];
        const incoming = (match.events ?? [])
          .filter((event) => event.type === "substitution" && event.playerIn?.toString() === playerId)
          .sort((a, b) => a.minute - b.minute)[0];
        stats.minutes += outgoing?.minute ?? (incoming ? Math.max(0, duration - incoming.minute) : duration);
      }

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
