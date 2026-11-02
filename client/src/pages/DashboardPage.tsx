import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { usePlayers } from "../hooks/usePlayers";
import { useTrainings } from "../hooks/useTrainings";
import { seasonLabel } from "../lib/teams";
import { canEditCallup, canManageMatches, canRecordMatch, finishedNewestFirst, nextMatch } from "../lib/matches";
import { canManageTrainings } from "../lib/trainings";
import { canSeeStats } from "../lib/players";
import {
  DEFAULT_YELLOW_CARDS_LIMIT,
  leaguePoints,
  matchRecord,
  pendingTasks,
  sanctionRisk,
  squadCounts,
} from "../lib/dashboard";
import { LastMatchCard, NextMatchCard } from "../components/MatchCards";
import WeekCalendar from "../components/WeekCalendar";
import { PointsBlock, SanctionBlock, SquadBlock, TasksBlock } from "../components/DashboardBlocks";

/**
 * Dashboard del equipo: bienvenida, plantilla y partidos, puntos de liga,
 * próximo y último partido, calendario de la semana, tareas pendientes y
 * riesgo de sanción. Todo se calcula con los datos que ya cargan las demás
 * pantallas, y cada rol ve solo lo que le corresponde.
 */
function DashboardPage() {
  const { data: user } = useSession();
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const players = usePlayers(teamId);
  const matches = useMatches(teamId);
  const trainings = useTrainings(teamId);
  const navigate = useNavigate();

  if (!current?.team || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  const team = current.team;
  const season = current.currentSeason;
  const role = current.role;

  // "Sábado, 7 de noviembre de 2026", con la primera letra en mayúscula
  const todayText = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const today = todayText.charAt(0).toUpperCase() + todayText.slice(1);

  if (players.isPending || matches.isPending || trainings.isPending) {
    return <p className="p-6">Cargando el dashboard...</p>;
  }

  const playerList = players.data ?? [];
  const matchList = matches.data ?? [];
  const trainingList = trainings.data ?? [];
  const failed = players.isError || matches.isError || trainings.isError;

  const next = nextMatch(matchList);
  const last = finishedNewestFirst(matchList)[0];
  const yellowLimit = season.yellowCardsLimit ?? DEFAULT_YELLOW_CARDS_LIMIT;

  const tasks = pendingTasks({
    trainings: trainingList,
    matches: matchList,
    canManageTrainings: canManageTrainings(role),
    canRecordMatch: canRecordMatch(role),
    canEditCallup: canEditCallup(role),
  });

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold">
        Hola, {user?.name} - {team.name}
      </h1>
      <p className="text-sm text-gray-600">
        {today} · Temporada {seasonLabel(season.startYear)}
      </p>

      {failed && (
        <p className="mt-3 text-sm text-red-600">No se han podido cargar todos los datos.</p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SquadBlock counts={squadCounts(playerList)} record={matchRecord(matchList)} />
        <PointsBlock points={leaguePoints(matchList)} />

        <section>
          <h2 className="mb-2 text-lg font-semibold">Próximo partido</h2>
          {next ? (
            <NextMatchCard match={next} teamName={team.name} division={season.division} />
          ) : (
            <div className="rounded border border-dashed border-gray-300 p-4 text-center">
              <p className="text-gray-600">No hay partidos programados</p>
              {canManageMatches(role) && (
                <button
                  type="button"
                  onClick={() => navigate("/partidos", { state: { openForm: true } })}
                  className="mt-3 rounded bg-green-700 px-4 py-2 text-white"
                >
                  Programar partido
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Último partido</h2>
          {last ? (
            <LastMatchCard match={last} teamName={team.name} division={season.division} />
          ) : (
            <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              Aún no has jugado ningún partido esta temporada.
            </p>
          )}
        </section>

        <div className="md:col-span-2">
          <WeekCalendar
            trainings={trainingList}
            matches={matchList}
            division={season.division}
          />
        </div>

        <TasksBlock tasks={tasks} />

        {/* Las amarillas son una estadística: el médico no las ve */}
        {canSeeStats(role) && (
          <SanctionBlock
            teamId={team._id}
            players={sanctionRisk(playerList, yellowLimit)}
            limit={yellowLimit}
            canEdit={role === "head_coach"}
          />
        )}
      </div>
    </main>
  );
}

export default DashboardPage;
