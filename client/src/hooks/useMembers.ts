import { useQuery } from "@tanstack/react-query";
import { getMembers, type Member } from "../api/club";

/** Miembros del equipo. No consulta nada hasta que haya equipo. */
export function useMembers(teamId: string | undefined) {
  return useQuery<Member[]>({
    queryKey: ["members", teamId],
    queryFn: () => getMembers(teamId as string),
    enabled: Boolean(teamId),
  });
}
