import { useMyTeams } from "./useMyTeams";

/**
 * Equipo con el que se está trabajando. De momento es el primero de la
 * lista del usuario; cuando haya varios equipos, aquí irá el selector.
 */
export function useCurrentTeam() {
  const { data: teams, isPending, isError } = useMyTeams();
  return { current: teams?.[0], isPending, isError };
}