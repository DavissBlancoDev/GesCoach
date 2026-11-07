import type { Types } from "mongoose";

// Titulares de cada modalidad: fútbol 7, 8 y 11
const STARTERS_BY_MODALITY: Record<string, number> = { f7: 7, f8: 8, f11: 11 };

/** Cuántos titulares tiene un equipo según la modalidad de la temporada. */
export const startersRequired = (modality: string): number =>
  STARTERS_BY_MODALITY[modality] ?? 11;

// Un convocado con su papel en la alineación
export interface LineupEntry {
  player: Types.ObjectId;
  jerseyNumber?: number; // dorsal de ESTE partido, si es distinto del fijo
  starter: boolean;
}

// Lo que hace falta saber de cada jugador de la plantilla: su dorsal fijo
export interface SquadInfo {
  jerseyNumber?: number;
}

/** Mapa jugador -> sus datos de plantilla, para consultar los dorsales fijos. */
export function buildSquadMap(
  entries: { player: Types.ObjectId; jerseyNumber?: number | null }[]
): Map<string, SquadInfo> {
  return new Map(
    entries.map((e) => [e.player.toString(), { jerseyNumber: e.jerseyNumber ?? undefined }])
  );
}

/**
 * Dorsal con el que juega un convocado: el de ese partido si lo tiene y, si
 * no, su dorsal fijo de la temporada. Puede no tener ninguno.
 */
export function effectiveJersey(
  entry: LineupEntry,
  squad: Map<string, SquadInfo>
): number | undefined {
  return entry.jerseyNumber ?? squad.get(entry.player.toString())?.jerseyNumber;
}

/** Dorsales que se repiten entre los convocados de un partido, de menor a mayor. */
export function duplicatedJerseys(entries: LineupEntry[], squad: Map<string, SquadInfo>): number[] {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    const jersey = effectiveJersey(entry, squad);
    if (jersey !== undefined) counts.set(jersey, (counts.get(jersey) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([jersey]) => jersey)
    .sort((a, b) => a - b);
}

/**
 * Lo que falta para poder empezar el partido. Una lista vacía significa que
 * la alineación está completa: hay convocatoria, los titulares que
 * corresponden, un portero entre ellos y todos los convocados tienen un
 * dorsal distinto.
 */
export function lineupProblems(
  match: { callup: LineupEntry[]; goalkeeper?: Types.ObjectId | null },
  squad: Map<string, SquadInfo>,
  required: number
): string[] {
  if (match.callup.length === 0) return ["Falta hacer la convocatoria"];

  const problems: string[] = [];
  const starters = match.callup.filter((e) => e.starter);

  if (starters.length < required) {
    problems.push(`Faltan titulares: hay ${starters.length} de ${required}`);
  } else if (starters.length > required) {
    problems.push(`Sobran titulares: hay ${starters.length} y son ${required}`);
  }

  const goalkeeper = match.goalkeeper;
  if (!goalkeeper || !starters.some((e) => e.player.equals(goalkeeper))) {
    problems.push("Falta marcar al portero entre los titulares");
  }

  const withoutJersey = match.callup.filter((e) => effectiveJersey(e, squad) === undefined).length;
  if (withoutJersey > 0) {
    problems.push(
      withoutJersey === 1 ? "Hay 1 convocado sin dorsal" : `Hay ${withoutJersey} convocados sin dorsal`
    );
  }

  for (const jersey of duplicatedJerseys(match.callup, squad)) {
    problems.push(`El dorsal ${jersey} está repetido`);
  }

  return problems;
}
