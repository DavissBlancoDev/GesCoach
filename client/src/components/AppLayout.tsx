import { Link, NavLink, Outlet } from "react-router-dom";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import UserMenu from "./UserMenu";

// Estilo de cada enlace según esté activo o no
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-green-700 text-white shadow-sm"
      : "text-gray-600 hover:bg-white hover:text-green-800"
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
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
              <img
                src="/favicon.png"
                alt="GesCoach"
                className="h-10 w-10 shrink-0 rounded-xl bg-black p-1 object-contain shadow-sm"
              />
              <span className="min-w-0 truncate text-base font-bold tracking-tight text-gray-900">
                GesCoach <span className="font-normal text-gray-400">·</span>{" "}
                <span className="text-green-800">{current?.team?.name}</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-green-200 hover:bg-green-50 hover:text-green-800"
              >
                Cambiar de equipo
              </Link>
              <UserMenu />
            </div>
          </div>
          {/* Los enlaces saltan de línea si no caben, por ejemplo en el móvil */}
          <nav className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
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
