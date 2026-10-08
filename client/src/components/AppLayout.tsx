import { NavLink, Outlet } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { useCurrentTeam } from "../hooks/useCurrentTeam";

// Estilo de cada enlace según esté activo o no
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1 text-sm ${
    isActive ? "bg-green-700 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

/**
 * Estructura común de las pantallas con sesión y equipo: cabecera con
 * navegación y, debajo, la pantalla que corresponda a la ruta.
 */
function AppLayout() {
  const { current } = useCurrentTeam();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["session"], null);
      // Vaciamos la caché de datos del equipo para que no los vea otra
      // persona que inicie sesión después en el mismo navegador
      queryClient.removeQueries({ queryKey: ["teams"] });
      queryClient.removeQueries({ queryKey: ["players"] });
    },
  });

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 p-3">
          <span className="truncate font-bold">{current?.team?.name ?? "GesCoach"}</span>
          <nav className="flex gap-1">
            <NavLink to="/" end className={linkClass}>
              Inicio
            </NavLink>
            <NavLink to="/plantilla" className={linkClass}>
              Plantilla
            </NavLink>
          </nav>
          <button
            className="text-sm text-gray-600 underline"
            onClick={() => logoutMutation.mutate()}
          >
            Salir
          </button>
        </div>
      </header>
      <Outlet />
    </>
  );
}

export default AppLayout;