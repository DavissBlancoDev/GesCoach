import { useQuery } from "@tanstack/react-query";
import { getMyTeams, type MyTeam } from "../api/teams";

/** Equipos del usuario actual. Lista vacía = aún no ha creado ninguno. */
export function useMyTeams() {
  return useQuery<MyTeam[]>({
    queryKey: ["teams", "mine"],
    queryFn: getMyTeams,
    staleTime: 60 * 1000,
  });
}