import type { Match } from "../api/matches";
import type { Training } from "../api/trainings";
import { RESULT_STYLES, VENUE_ICONS, competitionLabel } from "./matches";

// Un elemento del calendario: un entreno o un partido
export interface CalendarEvent {
  key: string;
  kind: "training" | "match";
  date: string; // AAAA-MM-DD
  time?: string; // "HH:MM"
  label: string; // texto corto que se ve en el calendario
  href: string; // pantalla a la que lleva
  className: string; // colores (de borde, fondo y texto)
  title: string; // texto largo, al pasar el ratón
}

// Un hueco de la cuadrícula del mes. Los huecos de antes del día 1 y de
// después del último día no llevan número.
export interface MonthCell {
  day: number | null;
  key: string | null; // AAAA-MM-DD, o null si es un hueco vacío
}

// La semana empieza en lunes
export const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const pad = (n: number) => String(n).padStart(2, "0");

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Clave de un día: AAAA-MM-DD. El mes va de 0 a 11, como en Date. */
export const dateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/**
 * Une los entrenos y los partidos en un Map: día (AAAA-MM-DD) -> sus
 * elementos, ordenados por hora (los que no tienen hora, al final).
 *
 * Colores: los entrenos, azul (gris y tachado si están suspendidos). Los
 * partidos, morado mientras están pendientes o en juego, y del color del
 * resultado (verde, amarillo anaranjado o rojo) cuando han terminado.
 */
export function buildEvents(
  trainings: Training[],
  matches: Match[],
  division: string
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  const add = (event: CalendarEvent) => {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  };

  for (const t of trainings) {
    const cancelled = t.status === "cancelled";
    add({
      key: `training-${t.id}`,
      kind: "training",
      date: t.date.slice(0, 10),
      time: t.startTime,
      label: "Entreno",
      href: `/entrenos/${t.id}`,
      className: cancelled
        ? "border-gray-300 bg-gray-100 text-gray-500 line-through"
        : "border-blue-300 bg-blue-100 text-blue-900",
      title: ["Entreno", t.startTime, t.location, cancelled ? "suspendido" : undefined]
        .filter(Boolean)
        .join(" · "),
    });
  }

  for (const m of matches) {
    // El marcador solo se ve cuando el partido ya ha empezado
    const score = m.status !== "pending" ? ` ${m.goalsFor ?? 0}-${m.goalsAgainst ?? 0}` : "";
    add({
      key: `match-${m.id}`,
      kind: "match",
      date: m.date.slice(0, 10),
      time: m.time,
      label: `${VENUE_ICONS[m.venue]} ${m.opponent.name}${score}`,
      href: `/partidos/${m.id}`,
      className: m.result
        ? `${RESULT_STYLES[m.result].box} text-gray-900`
        : "border-purple-300 bg-purple-100 text-purple-900",
      title: [
        competitionLabel(m.competition, division),
        `vs ${m.opponent.name}`,
        m.time ?? "Hora por confirmar",
      ].join(" · "),
    });
  }

  for (const list of map.values()) {
    list.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  }
  return map;
}

/** Huecos de la cuadrícula de un mes, empezando en lunes y completando la última semana. */
export function monthCells(year: number, month: number): MonthCell[] {
  // getDay() da 0 para el domingo; lo pasamos a "lunes = 0"
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = 0; i < offset; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= days; d++) cells.push({ day: d, key: dateKey(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null });
  return cells;
}

/** Título del mes: "Octubre 2026". */
export const monthTitle = (year: number, month: number) =>
  capitalize(new Date(year, month, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" }));

/** Encabezado de un día en la lista: "Sábado 7". */
export function dayHeading(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return capitalize(
    new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-ES", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
    })
  );
}
