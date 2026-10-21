import { useQuery } from "@tanstack/react-query";
import { getPlayerNotes, type PlayerNote } from "../api/playerNotes";

/** Notas de un jugador. No consulta nada hasta que haya equipo y jugador. */
export function usePlayerNotes(teamId: string | undefined, playerId: string | undefined) {
  return useQuery<PlayerNote[]>({
    // La clave incluye equipo y jugador: cada uno tiene su propia caché
    queryKey: ["playerNotes", teamId, playerId],
    queryFn: () => getPlayerNotes(teamId as string, playerId as string),
    enabled: Boolean(teamId) && Boolean(playerId),
  });
}
