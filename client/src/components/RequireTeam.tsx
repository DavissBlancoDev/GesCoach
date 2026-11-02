import { Navigate, Outlet } from "react-router-dom";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMyTeams } from "../hooks/useMyTeams";

/**
 * Se coloca dentro de ProtectedRoute y protege las pantallas de un equipo:
 *  - Si el usuario no tiene ningún equipo, lo manda a crearlo.
 *  - Si tiene equipos pero no ha elegido ninguno (o el elegido ya no es suyo),
 *    lo manda a la pantalla de inicio para que elija.
 */
function RequireTeam() {
  const { data: teams, isPending, isError } = useMyTeams();
  const { current } = useCurrentTeam();

  if (isPending) return <p className="p-6">Cargando...</p>;
  if (isError || !teams) return <p className="p-6">No se pueden cargar tus equipos.</p>;
  if (teams.length === 0) return <Navigate to="/crear-equipo" replace />;
  if (!current) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default RequireTeam;
