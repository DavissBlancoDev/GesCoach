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
