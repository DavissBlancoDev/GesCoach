import type { PlayerStats, SquadPlayer } from "../api/players";
import type { Match } from "../api/matches";

// Una estadística: cómo se llama el dato, cómo se abrevia en la cabecera
// de la tabla y qué significa.
export interface StatColumn {
  key: keyof PlayerStats;
  header: string; // abreviatura para la cabecera de la tabla
  title: string; // significado completo
  goalkeeperOnly?: boolean; // solo tiene sentido para porteros
  hideOnMobile?: boolean; // se oculta de la tabla de la plantilla en pantallas pequeñas
}

// Para mostrar u ocultar una columna en el móvil, cambia su hideOnMobile.
// En la ficha del jugador se muestran todas, sin ocultar ninguna.
export const STAT_COLUMNS: StatColumn[] = [
  { key: "calledUp", header: "Conv", title: "Partidos convocado", hideOnMobile: true },
  { key: "played", header: "PJ", title: "Partidos jugados" },
  { key: "started", header: "PT", title: "Partidos como titular", hideOnMobile: true },
  { key: "minutes", header: "Min", title: "Minutos jugados" },
  { key: "goals", header: "G", title: "Goles" },
  { key: "assists", header: "A", title: "Asistencias" },
  { key: "yellowCards", header: "🟨", title: "Tarjetas amarillas" },
  { key: "redCards", header: "🟥", title: "Tarjetas rojas" },
  {
    key: "cleanSheets",
    header: "P0",
    title: "Porterías a cero",
    goalkeeperOnly: true,
    hideOnMobile: true,
  },
  {
    key: "goalsConceded",
    header: "GE",
    title: "Goles encajados",
    goalkeeperOnly: true,
    hideOnMobile: true,
  },
];

/** Un jugador cuenta como portero si lo es como posición principal o secundaria. */
export const isGoalkeeper = (player: Pick<SquadPlayer, "mainPosition" | "secondaryPositions">) =>
  player.mainPosition === "portero" || player.secondaryPositions.includes("portero");

/** Estadísticas de un jugador dentro de un partido, calculadas desde el acta. */
export function matchPlayerStats(match: Match, playerId: string) {
  const lineupPlayer = match.lineup?.players.find((entry) => entry.player === playerId);
  const starter = lineupPlayer?.starter ?? false;
  let active = starter;
  let intervalStart = starter ? 0 : undefined;
  let minutes = 0;

  const substitutions = (match.events ?? [])
    .filter((event) => event.type === "substitution")
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index);

  for (const { event } of substitutions) {
    const minute = Math.max(0, Math.min(match.durationMinutes, event.minute));
    if (event.playerOut === playerId && active) {
      minutes += Math.max(0, minute - (intervalStart ?? minute));
      active = false;
      intervalStart = undefined;
    }
    if (event.playerIn === playerId && !active) {
      active = true;
      intervalStart = minute;
    }
  }

  if (active) minutes += Math.max(0, match.durationMinutes - (intervalStart ?? match.durationMinutes));

  const events = match.events ?? [];
  return {
    starter,
    minutes,
    goals: events.filter((event) => event.type === "goal" && event.side === "for" && !event.ownGoal && event.player === playerId).length,
    assists: events.filter((event) => event.type === "goal" && event.side === "for" && event.assist === playerId).length,
    yellowCards: events.filter((event) => event.type === "yellow_card" && event.player === playerId).length,
    redCards: events.filter((event) => event.type === "red_card" && event.player === playerId).length,
  };
}

export interface SeasonStats {
  played: number;
  leaguePlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  points: number;
}

export interface MatchStatPoint {
  match: Match;
  difference: number;
  yellowFor: number;
  redFor: number;
  yellowAgainst: number;
  redAgainst: number;
}

export interface PlayerCardStats {
  yellowCards: number;
  redCards: number;
}

/** Resumen de los partidos finalizados de la temporada. */
export function seasonStats(matches: Match[]): SeasonStats {
  const finished = matches.filter((match) => match.status === "finished");
  const league = finished.filter((match) => match.competition === "league");
  const wins = finished.filter((match) => match.result === "win").length;
  const draws = finished.filter((match) => match.result === "draw").length;
  const leagueWins = league.filter((match) => match.result === "win").length;
  const leagueDraws = league.filter((match) => match.result === "draw").length;
  const goalsFor = finished.reduce((total, match) => total + (match.goalsFor ?? 0), 0);
  const goalsAgainst = finished.reduce((total, match) => total + (match.goalsAgainst ?? 0), 0);

  return {
    played: finished.length,
    leaguePlayed: league.length,
    wins,
    draws,
    losses: finished.length - wins - draws,
    goalsFor,
    goalsAgainst,
    cleanSheets: finished.filter((match) => (match.goalsAgainst ?? 0) === 0).length,
    points: leagueWins * 3 + leagueDraws,
  };
}

/** Datos por partido para gráficas y listados de análisis. */
export function matchStatPoints(matches: Match[], ourPlayerIds?: ReadonlySet<string>): MatchStatPoint[] {
  return matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((match) => {
      const events = match.events ?? [];
      const cards = (type: "yellow_card" | "red_card", side: "for" | "against") =>
        events.filter((event) => {
          if (event.type !== type) return false;
          // El jugador es la fuente más fiable para nuestras tarjetas. El
          // side se conserva como fallback para las tarjetas del rival.
          const isOurs = event.player && ourPlayerIds?.has(event.player);
          return isOurs ? side === "for" : event.side === side;
        }).length;

      return {
        match,
        difference: (match.goalsFor ?? 0) - (match.goalsAgainst ?? 0),
        yellowFor: cards("yellow_card", "for"),
        redFor: cards("red_card", "for"),
        yellowAgainst: cards("yellow_card", "against"),
        redAgainst: cards("red_card", "against"),
      };
    });
}

/**
 * Recuento de tarjetas directamente desde las actas. Se incluyen también
 * partidos en juego, porque una tarjeta registrada ya debe aparecer en la
 * temporada aunque el partido todavía no haya terminado.
 */
export function playerCardStats(matches: Match[]): Map<string, PlayerCardStats> {
  const result = new Map<string, PlayerCardStats>();

  for (const match of matches) {
    for (const event of match.events ?? []) {
      if ((event.type !== "yellow_card" && event.type !== "red_card") || !event.player) continue;
      const current = result.get(event.player) ?? { yellowCards: 0, redCards: 0 };
      if (event.type === "yellow_card") current.yellowCards += 1;
      else current.redCards += 1;
      result.set(event.player, current);
    }
  }

  return result;
}
