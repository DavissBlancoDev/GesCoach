import type { Types } from "mongoose";

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
  _seasonId: Types.ObjectId,
  _playerIds: string[]
): Promise<Map<string, PlayerStats>> {
  return new Map();
}