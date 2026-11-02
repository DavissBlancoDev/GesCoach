import { useSyncExternalStore } from "react";
import { useMyTeams } from "./useMyTeams";
import { getSelectedTeamId, subscribeSelectedTeam } from "../lib/selectedTeam";

/**
 * Equipo con el que se está trabajando: el que el usuario ha elegido en la
 * pantalla de inicio. Si no ha elegido ninguno pero solo tiene uno, es ese.
 * Si tiene varios y no ha elegido, "current" queda sin definir (RequireTeam
 * lo manda entonces a la pantalla de inicio).
 */
export function useCurrentTeam() {
  const { data: teams, isPending, isError } = useMyTeams();
  const selectedId = useSyncExternalStore(subscribeSelectedTeam, getSelectedTeamId);

  const current =
    teams?.find((t) => t.team?._id === selectedId) ??
    (teams?.length === 1 ? teams[0] : undefined);

  return { current, isPending, isError };
}
