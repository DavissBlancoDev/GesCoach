import { useQuery } from "@tanstack/react-query";
import { getPlayers, type SquadPlayer } from "../api/players";

/** Plantilla de un equipo. No consulta nada hasta que haya teamId. */
export function usePlayers(teamId: string | undefined) {
  return useQuery<SquadPlayer[]>({
    // La clave incluye el equipo: cada equipo tiene su propia caché
    queryKey: ["players", teamId],
    queryFn: () => getPlayers(teamId as string),
    enabled: Boolean(teamId),
  });
}