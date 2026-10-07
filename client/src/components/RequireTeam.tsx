import { Navigate, Outlet } from "react-router-dom";
import { useMyTeams } from "../hooks/useMyTeams";

/**
 * Se coloca dentro de ProtectedRoute. Si el usuario todavía no tiene
 * ningún equipo, lo manda al asistente de creación de equipo.
 */
function RequireTeam() {
  const { data: teams, isPending, isError } = useMyTeams();

  if (isPending) return <p className="p-6">Cargando...</p>;
  if (isError) return <p className="p-6">No se pueden cargar tus equipos.</p>;
  if (teams.length === 0) return <Navigate to="/crear-equipo" replace />;

  return <Outlet />;
}

export default RequireTeam;