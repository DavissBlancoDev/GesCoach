import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { usePlayers } from "../hooks/usePlayers";
import { canEditSquad, canSeeStats } from "../lib/players";
import Modal from "../components/Modal";
import PlayerForm from "../components/PlayerForm";
import SquadTable, { type GroupMode } from "../components/SquadTable";

type LeaderStat = "minutes" | "played" | "goals" | "assists";

const LEADER_STATS: Array<{
  key: LeaderStat;
  label: string;
  suffix: string;
  accent: string;
}> = [
  { key: "minutes", label: "Más minutos", suffix: "min", accent: "border-blue-200 bg-blue-50" },
  { key: "played", label: "Más partidos", suffix: "PJ", accent: "border-violet-200 bg-violet-50" },
  { key: "goals", label: "Máximo goleador", suffix: "goles", accent: "border-amber-200 bg-amber-50" },
  { key: "assists", label: "Más asistencias", suffix: "asistencias", accent: "border-emerald-200 bg-emerald-50" },
];

function SquadLeaders({
  players,
}: {
  players: NonNullable<ReturnType<typeof usePlayers>["data"]>;
}) {
  const leaders = LEADER_STATS.map((stat) => {
    const player = players.reduce<typeof players[number] | undefined>(
      (leader, candidate) => {
        const candidateValue = candidate.stats?.[stat.key];
        const leaderValue = leader?.stats?.[stat.key];
        if (candidateValue === undefined) return leader;
        if (leaderValue === undefined || candidateValue > leaderValue) return candidate;
        return leader;
      },
      undefined,
    );

    return { stat, player };
  });

  if (leaders.every(({ player }) => !player)) return null;

  return (
    <section className="mb-6" aria-label="Líderes estadísticos">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {leaders.map(({ stat, player }) => {
          const value = player?.stats?.[stat.key];
          const name = player
            ? player.nickname || `${player.name} ${player.surname}`
            : "Sin datos";

          return (
            <div
              key={stat.key}
              className={`min-h-32 rounded-lg border p-4 ${stat.accent}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {stat.label}
              </p>
              {player ? (
                <Link
                  to={`/plantilla/${player.id}`}
                  className="mt-3 block truncate font-semibold text-gray-900 hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <p className="mt-3 font-semibold text-gray-500">{name}</p>
              )}
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                {value ?? 0} <span className="text-sm font-medium text-gray-600">{stat.suffix}</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Plantilla de la temporada actual: tabla a todo el ancho con las
 * estadísticas de cada jugador. Pulsar un jugador abre su ficha, y desde
 * aquí se añaden jugadores nuevos.
 */
function SquadPage() {
  const { current } = useCurrentTeam();
  const { data: players, isPending, isError } = usePlayers(current?.team?._id);
  const [showForm, setShowForm] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("none");

  // RequireTeam garantiza que hay equipo; esto cubre el instante de carga
  if (!current || !current.team || !current.currentSeason) {
    return <p className="p-6">Cargando...</p>;
  }

  const canEdit = canEditSquad(current.role);
  const showStats = canSeeStats(current.role);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plantilla</h1>
          {players && (
            <p className="text-sm text-gray-600">
              {players.length} {players.length === 1 ? "jugador" : "jugadores"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="squad-group-mode" className="text-sm font-medium text-gray-700">
            Agrupar por...
          </label>
          <select
            id="squad-group-mode"
            value={groupMode}
            onChange={(event) => setGroupMode(event.target.value as GroupMode)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="none">Sin agrupar</option>
            <option value="position">Posición</option>
            <option value="license">Ficha</option>
          </select>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-green-700 px-4 py-2 text-white"
          >
            Añadir jugador
          </button>
        )}
        </div>
      </div>

      {/* El formulario se queda estrecho aunque la página sea ancha */}
      {showForm && (
        <Modal
          title="Añadir jugador"
          onClose={() => setShowForm(false)}
          className="max-w-2xl"
        >
          <PlayerForm
            teamId={current.team._id}
            role={current.role}
            defaultCategory={current.currentSeason.category}
            onDone={() => setShowForm(false)}
            showTitle={false}
          />
        </Modal>
      )}

      {isPending && <p>Cargando plantilla...</p>}
      {isError && <p className="text-red-600">No se ha podido cargar la plantilla.</p>}

      {showStats && players && players.length > 0 && <SquadLeaders players={players} />}

      {players && players.length === 0 && !showForm && (
        <p className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-600">
          Aún no hay jugadores en la plantilla.
        </p>
      )}

      {players && players.length > 0 && <SquadTable players={players} showStats={showStats} groupMode={groupMode} />}
    </main>
  );
}

export default SquadPage;
