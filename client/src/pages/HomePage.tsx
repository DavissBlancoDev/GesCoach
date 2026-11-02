import { Navigate, useNavigate } from "react-router-dom";
import { useMyTeams } from "../hooks/useMyTeams";
import { useSession } from "../hooks/useSession";
import { useLogout } from "../hooks/useLogout";
import { setSelectedTeamId } from "../lib/selectedTeam";
import { CATEGORY_LABELS, MODALITY_LABELS, ROLE_LABELS, seasonLabel } from "../lib/teams";

/**
 * Pantalla de inicio tras iniciar sesión: saluda y lista los equipos a los
 * que el usuario tiene acceso (el suyo y los que le hayan invitado), cada uno
 * con su rol. Al elegir uno se entra en su dashboard, ya con la barra de
 * navegación del equipo.
 */
function HomePage() {
  const { data: user } = useSession();
  const { data: teams, isPending, isError } = useMyTeams();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  if (isPending) return <p className="p-6">Cargando...</p>;
  if (isError || !teams) return <p className="p-6">No se pueden cargar tus equipos.</p>;

  // Quien aún no tiene ningún equipo pasa primero por crearlo
  if (teams.length === 0) return <Navigate to="/crear-equipo" replace />;

  /** Elige el equipo y entra en su dashboard. */
  function openTeam(teamId: string) {
    setSelectedTeamId(teamId);
    navigate("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold">GesCoach</span>
        <button
          className="text-sm text-gray-600 underline"
          onClick={() => logoutMutation.mutate()}
        >
          Salir
        </button>
      </div>

      <h1 className="mt-8 text-2xl font-bold">Hola, {user?.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {teams.length === 1
          ? "Este es tu equipo."
          : "Estos son tus equipos. Elige con cuál quieres trabajar."}
      </p>

      <ul className="mt-4 space-y-3">
        {teams.map(({ team, currentSeason, role }) =>
          team ? (
            <li key={team._id}>
              <button
                type="button"
                onClick={() => openTeam(team._id)}
                // El borde izquierdo lleva el color principal del equipo
                style={{ borderLeftColor: team.primaryColor, borderLeftWidth: 6 }}
                className="w-full rounded border border-gray-200 p-4 text-left hover:bg-gray-50"
              >
                <span className="block text-lg font-semibold">{team.name}</span>
                {currentSeason && (
                  <>
                    <span className="block text-sm text-gray-600">
                      {CATEGORY_LABELS[currentSeason.category]} ·{" "}
                      {MODALITY_LABELS[currentSeason.modality]} · Temporada{" "}
                      {seasonLabel(currentSeason.startYear)}
                    </span>
                    <span className="block text-sm text-gray-600">{currentSeason.division}</span>
                  </>
                )}
                <span className="mt-2 block text-sm">Tu rol: {ROLE_LABELS[role]}</span>
              </button>
            </li>
          ) : null
        )}
      </ul>
    </main>
  );
}

export default HomePage;
