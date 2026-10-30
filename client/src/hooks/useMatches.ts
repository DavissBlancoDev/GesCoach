import { useQuery } from "@tanstack/react-query";
import { getMatches, getOpponents, type Match, type Opponent } from "../api/matches";

/** Partidos de la temporada actual. No consulta nada hasta que haya equipo. */
export function useMatches(teamId: string | undefined) {
  return useQuery<Match[]>({
    queryKey: ["matches", teamId],
    queryFn: () => getMatches(teamId as string),
    enabled: Boolean(teamId),
  });
}

/** Rivales ya usados, para sugerirlos en el formulario. */
export function useOpponents(teamId: string | undefined) {
  return useQuery<Opponent[]>({
    queryKey: ["opponents", teamId],
    queryFn: () => getOpponents(teamId as string),
    enabled: Boolean(teamId),
  });
}
