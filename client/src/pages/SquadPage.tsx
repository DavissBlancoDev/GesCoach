import { useState } from "react";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { usePlayers } from "../hooks/usePlayers";
import { canEditSquad, canSeeStats } from "../lib/players";
import PlayerForm from "../components/PlayerForm";
import SquadTable from "../components/SquadTable";

/**
 * Plantilla de la temporada actual: tabla a todo el ancho con las
 * estadísticas de cada jugador. Pulsar un jugador abre su ficha, y desde
 * aquí se añaden jugadores nuevos.
 */
function SquadPage() {
  const { current } = useCurrentTeam();
  const { data: players, isPending, isError } = usePlayers(current?.team?._id);
  const [showForm, setShowForm] = useState(false);

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
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-green-700 px-4 py-2 text-white"
          >
            Añadir jugador
          </button>
        )}
      </div>

      {/* El formulario se queda estrecho aunque la página sea ancha */}
      {showForm && (
        <div className="mb-6 max-w-2xl">
          <PlayerForm
            teamId={current.team._id}
            role={current.role}
            defaultCategory={current.currentSeason.category}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {isPending && <p>Cargando plantilla...</p>}
      {isError && <p className="text-red-600">No se ha podido cargar la plantilla.</p>}

      {players && players.length === 0 && !showForm && (
        <p className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-600">
          Aún no hay jugadores en la plantilla.
        </p>
      )}

      {players && players.length > 0 && <SquadTable players={players} showStats={showStats} />}
    </main>
  );
}

export default SquadPage;
