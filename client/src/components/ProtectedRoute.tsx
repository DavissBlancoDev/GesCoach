import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../hooks/useSession";

function ProtectedRoute() {
  const { data: user, isPending, isError } = useSession();

  if (isPending) return <p className="p-6">Cargando...</p>;
  if (isError) return <p className="p-6">No se puede conectar con el servidor.</p>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default ProtectedRoute;