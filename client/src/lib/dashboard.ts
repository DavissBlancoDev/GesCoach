import type { Match } from "../api/matches";
import type { PlayerStatus, SquadPlayer } from "../api/players";
import type { Training } from "../api/trainings";
import { dateKey } from "./calendar";
import { formatMatchDateShort } from "./matches";
import { todayIso } from "./trainings";

// Horas de antelación a partir de las cuales se avisa de que falta la
// convocatoria de un partido (2 días)
export const CALLUP_WARNING_HOURS = 48;

// Amarillas que suponen una sanción, mientras no se ajuste otra cosa en la
// temporada. Depende del reglamento de la competición.
export const DEFAULT_YELLOW_CARDS_LIMIT = 5;

export interface SquadCounts {
  total: number;
  available: number;
  injured: number;
  suspended: number;
  inactive: number;
}

export interface MatchRecord {
  played: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface LeaguePoints {
  played: number;
  points: number;
  maxPoints: number;
}

export interface PendingTask {
  key: string;
  text: string;
  href: string;
}

/** Jugadores de la plantilla según su estado. */
export function squadCounts(players: SquadPlayer[]): SquadCounts {
  const count = (status: PlayerStatus) => players.filter((p) => p.status === status).length;
  return {
    total: players.length,
    available: count("available"),
    injured: count("injured"),
    suspended: count("suspended"),
    inactive: count("inactive"),
  };
}

/** Partidos jugados y su récord (victorias, empates y derrotas), de todos los tipos de partido. */
export function matchRecord(matches: Match[]): MatchRecord {
  const finished = matches.filter((m) => m.status === "finished");
  return {
    played: finished.length,
    wins: finished.filter((m) => m.result === "win").length,
    draws: finished.filter((m) => m.result === "draw").length,
    losses: finished.filter((m) => m.result === "loss").length,
  };
}

/**
 * Puntos de liga: 3 por victoria y 1 por empate, sobre el máximo posible (3
 * por partido jugado). Solo cuentan los partidos de liga finalizados: copa,
 * torneo y amistosos no suman puntos.
 */
export function leaguePoints(matches: Match[]): LeaguePoints {
  const league = matches.filter((m) => m.status === "finished" && m.competition === "league");
  const wins = league.filter((m) => m.result === "win").length;
  const draws = league.filter((m) => m.result === "draw").length;
  return { played: league.length, points: wins * 3 + draws, maxPoints: league.length * 3 };
}

/** Los siete días de la semana de "today" (de lunes a domingo), como AAAA-MM-DD. */
export function weekDays(today: string = todayIso()): string[] {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const offsetToMonday = (date.getDay() + 6) % 7; // lunes = 0

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(year, month - 1, day - offsetToMonday + i);
    return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
  });
}

/**
 * Jugadores a una amarilla de la sanción: los que tienen una menos que el
 * límite. Quedan fuera los inactivos. Si el rol no ve las estadísticas, no
 * llegan las amarillas y el resultado es una lista vacía.
 */
export function sanctionRisk(players: SquadPlayer[], limit: number): SquadPlayer[] {
  return players.filter(
    (p) => p.status !== "inactive" && (p.stats?.yellowCards ?? 0) === limit - 1
  );
}

interface TaskInput {
  trainings: Training[];
  matches: Match[];
  // Solo se avisa de lo que el rol puede resolver
  canManageTrainings: boolean;
  canRecordMatch: boolean;
  canEditCallup: boolean;
  now?: Date;
}

/**
 * Tareas pendientes:
 *  - Convocatoria sin hacer a menos de 48 horas del partido.
 *  - Partido con la fecha pasada que no se ha finalizado.
 *  - Entreno con la fecha pasada sin pasar lista.
 * Cada tarea lleva a la pantalla donde se resuelve.
 */
export function pendingTasks(input: TaskInput): PendingTask[] {
  const now = input.now ?? new Date();
  const today = todayIso();
  const tasks: PendingTask[] = [];

  if (input.canEditCallup) {
    for (const m of input.matches) {
      if (m.status !== "pending" || m.date.slice(0, 10) < today) continue;
      // La convocatoria solo llega a los roles que pueden verla
      if (!m.callup || m.callup.length > 0) continue;

      // Sin hora se toma el inicio del día: es el caso más prudente
      const kickoff = new Date(`${m.date.slice(0, 10)}T${m.time ?? "00:00"}:00`);
      const hoursLeft = (kickoff.getTime() - now.getTime()) / 36e5;
      if (hoursLeft <= CALLUP_WARNING_HOURS) {
        tasks.push({
          key: `callup-${m.id}`,
          text: `Convocatoria sin hacer: ${m.opponent.name}, ${formatMatchDateShort(m.date)}${
            m.time ? ` a las ${m.time}` : ""
          }`,
          href: `/partidos/${m.id}`,
        });
      }
    }
  }

  if (input.canRecordMatch) {
    for (const m of input.matches) {
      if (m.status !== "finished" && m.date.slice(0, 10) < today) {
        tasks.push({
          key: `match-${m.id}`,
          text: `Partido contra ${m.opponent.name} (${formatMatchDateShort(m.date)}) sin finalizar`,
          href: `/partidos/${m.id}`,
        });
      }
    }
  }

  if (input.canManageTrainings) {
    for (const t of input.trainings) {
      if (t.status === "scheduled" && t.date.slice(0, 10) < today) {
        tasks.push({
          key: `training-${t.id}`,
          text: `Entreno del ${formatMatchDateShort(t.date)} sin pasar lista`,
          href: `/entrenos/${t.id}`,
        });
      }
    }
  }

  return tasks;
}
