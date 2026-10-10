import type { PlayerStats, SquadPlayer } from "../api/players";

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
