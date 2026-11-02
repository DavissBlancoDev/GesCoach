import { useSession } from "../hooks/useSession";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { seasonLabel } from "../lib/teams";

/**
 * Dashboard del equipo. De momento solo tiene el mensaje de bienvenida: el
 * nombre, el equipo, la fecha de hoy y la temporada. Los demás bloques
 * (plantilla, partidos, calendario de la semana, tareas...) se añaden después.
 */
function DashboardPage() {
  const { data: user } = useSession();
  const { current } = useCurrentTeam();

  if (!current?.team || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  // "Sábado, 7 de noviembre de 2026", con la primera letra en mayúscula
  const todayText = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const today = todayText.charAt(0).toUpperCase() + todayText.slice(1);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold">
        Hola, {user?.name} - {current.team.name}
      </h1>
      <p className="text-sm text-gray-600">
        {today} · Temporada {seasonLabel(current.currentSeason.startYear)}
      </p>

      <p className="mt-6 rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        Aquí irán los bloques del dashboard.
      </p>
    </main>
  );
}

export default DashboardPage;
