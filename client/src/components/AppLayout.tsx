import { Link, NavLink, Outlet } from "react-router-dom";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import UserMenu from "./UserMenu";

// Estilo de cada enlace según esté activo o no
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1 text-sm ${
    isActive ? "bg-green-700 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

/**
 * Estructura común de las pantallas de un equipo: cabecera con el nombre del
 * equipo, el botón para cambiar de equipo y el menú del usuario, la barra de
 * navegación, y debajo la pantalla que corresponda a la ruta.
 */
function AppLayout() {
  const { current } = useCurrentTeam();

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate font-bold">{current?.team?.name ?? "GesCoach"}</span>
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
              >
                Cambiar de equipo
              </Link>
              <UserMenu />
            </div>
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
