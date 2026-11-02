import { Link, NavLink, Outlet } from "react-router-dom";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useLogout } from "../hooks/useLogout";

// Estilo de cada enlace según esté activo o no
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1 text-sm ${
    isActive ? "bg-green-700 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

/**
 * Estructura común de las pantallas de un equipo: cabecera con el nombre del
 * equipo (que lleva a la pantalla de inicio, para cambiar de equipo), el
 * botón de salir y la barra de navegación, y debajo la pantalla que
 * corresponda a la ruta.
 */
function AppLayout() {
  const { current } = useCurrentTeam();
  const logoutMutation = useLogout();

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl p-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              title="Cambiar de equipo"
              className="truncate font-bold hover:underline"
            >
              {current?.team?.name ?? "GesCoach"}
            </Link>
            <button
              className="text-sm text-gray-600 underline"
              onClick={() => logoutMutation.mutate()}
            >
              Salir
            </button>
          </div>
          {/* Los enlaces saltan de línea si no caben, por ejemplo en el móvil */}
          <nav className="mt-2 flex flex-wrap gap-1">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/plantilla" className={linkClass}>
              Plantilla
            </NavLink>
            <NavLink to="/entrenos" className={linkClass}>
              Entrenos
            </NavLink>
            <NavLink to="/partidos" className={linkClass}>
              Partidos
            </NavLink>
            <NavLink to="/calendario" className={linkClass}>
              Calendario
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </>
  );
}

export default AppLayout;
