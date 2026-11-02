import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { setSelectedTeamId } from "../lib/selectedTeam";

/**
 * Cierra la sesión y limpia lo que haya en el navegador: el equipo elegido y
 * todos los datos en caché (equipos, jugadores, notas, entrenos, partidos...),
 * para que no los vea otra persona que inicie sesión después en el mismo
 * navegador. Al vaciar todo menos la sesión, no hay que mantener una lista de
 * qué borrar cada vez que se añade una pantalla.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setSelectedTeamId(null);
      queryClient.setQueryData(["session"], null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
    },
  });
}
