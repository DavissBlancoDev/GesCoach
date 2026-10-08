import { useSession } from "../hooks/useSession";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import {
  CATEGORY_LABELS,
  MODALITY_LABELS,
  ROLE_LABELS,
  seasonLabel,
} from "../lib/teams";

function DashboardPage() {
  const { data: user } = useSession();
  // Equipo con el que se trabaja (de momento, el primero del usuario).
  // Cuando haya varios equipos, el selector estará en useCurrentTeam.
  const { current } = useCurrentTeam();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold">Hola, {user?.name}</h1>

      {current?.team && current.currentSeason && (
        <section className="mt-4 rounded border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">{current.team.name}</h2>
          <p className="text-sm text-gray-600">
            {CATEGORY_LABELS[current.currentSeason.category]} ·{" "}
            {MODALITY_LABELS[current.currentSeason.modality]} · Temporada{" "}
            {seasonLabel(current.currentSeason.startYear)}
          </p>
          <p className="text-sm text-gray-600">{current.currentSeason.division}</p>
          <p className="mt-2 text-sm">Tu rol: {ROLE_LABELS[current.role]}</p>
        </section>
      )}
    </main>
  );
}

export default DashboardPage;