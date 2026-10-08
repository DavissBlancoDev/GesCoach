import { useState } from "react";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { usePlayers } from "../hooks/usePlayers";
import { CATEGORY_LABELS } from "../lib/teams";
import { PLAYER_STATUS_COLORS, PLAYER_STATUS_LABELS, canEditSquad } from "../lib/players";
import PositionBadge from "../components/PositionBadge";
import PlayerForm from "../components/PlayerForm";

/**
 * Plantilla de la temporada actual: lista de jugadores con su dorsal,
 * edad, ficha, posición principal y estado, y formulario para añadir.
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

  return (
    <main className="mx-auto max-w-2xl p-4">
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

      {showForm && (
        <div className="mb-6">
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

      {players && players.length > 0 && (
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded border border-gray-200 p-3"
            >
              {/* Dorsal, o un guion si no tiene */}
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold">
                {player.jerseyNumber ?? "–"}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {player.surname}, {player.name}
                  {player.nickname && (
                    <span className="text-gray-500"> · {player.nickname}</span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {player.age} años · {CATEGORY_LABELS[player.licenseCategory]}
                </p>
              </div>

              {/* Solo se destaca el estado cuando no es "disponible" */}
              {player.status !== "available" && (
                <span
                  className={`rounded px-2 py-1 text-xs ${PLAYER_STATUS_COLORS[player.status]}`}
                >
                  {PLAYER_STATUS_LABELS[player.status]}
                </span>
              )}

              <PositionBadge position={player.mainPosition} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default SquadPage;