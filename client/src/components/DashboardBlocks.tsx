import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSeasonSettings } from "../api/teams";
import type { SquadPlayer } from "../api/players";
import type { LeaguePoints, MatchRecord, PendingTask, SquadCounts } from "../lib/dashboard";
import StatusIcon from "./StatusIcon";

/** Plantilla según el estado de los jugadores, y partidos jugados con su récord. */
export function SquadBlock({ counts, record }: { counts: SquadCounts; record: MatchRecord }) {
  const tiles = [
    { label: "Disponibles", value: counts.available, status: "available" as const, alert: "" },
    { label: "Lesionados", value: counts.injured, status: "injured" as const, alert: "text-orange-700" },
    { label: "Sancionados", value: counts.suspended, status: "suspended" as const, alert: "text-red-700" },
    { label: "Inactivos", value: counts.inactive, status: "inactive" as const, alert: "" },
  ];

  return (
    <section className="rounded border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-semibold">Plantilla</h2>
      <div className="grid grid-cols-4 gap-2 text-center">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded bg-gray-50 p-2">
            <p className={`text-2xl font-bold tabular-nums ${tile.value > 0 ? tile.alert : ""}`}>
              {tile.value}
            </p>
            <p className="text-xs text-gray-600">
              {tile.status && <StatusIcon status={tile.status} />} {tile.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">{counts.total} en plantilla</p>

      <p className="mt-4 border-t border-gray-100 pt-3">
        <span className="text-lg font-semibold">Partidos: </span>{" "}
        <span className="text-2xl font-bold tabular-nums">{record.played}</span>{" "}
        <span className="text-sm text-gray-500">
          {record.wins} V - {record.draws} E - {record.losses} D
        </span>
      </p>
    </section>
  );
}

/** Puntos de liga obtenidos sobre el máximo posible. */
export function PointsBlock({ points }: { points: LeaguePoints }) {
  return (
    <section className="rounded border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-semibold">Puntos de liga</h2>
      {points.played === 0 ? (
        <p className="text-sm text-gray-600">Aún no has jugado ningún partido de liga.</p>
      ) : (
        <>
          <p>
            <span className="text-4xl font-bold tabular-nums">{points.points}</span>{" "}
            <span className="text-lg text-gray-600">puntos de {points.maxPoints}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {points.played} {points.played === 1 ? "partido de liga" : "partidos de liga"}. Cuentan
            3 puntos por victoria y 1 por empate.
          </p>
        </>
      )}
    </section>
  );
}

/** Tareas pendientes: cada una lleva a la pantalla donde se resuelve. */
export function TasksBlock({ tasks }: { tasks: PendingTask[] }) {
  return (
    <section className="rounded border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-semibold">
        Tareas pendientes
        {tasks.length > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-800">
            {tasks.length}
          </span>
        )}
      </h2>
      {tasks.length === 0 ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800">
          No tienes tareas pendientes.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.key}>
              <Link
                to={task.href}
                className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm hover:bg-amber-100"
              >
                <span aria-hidden="true">⚠️</span>
                <span>{task.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface YellowCardsDialogProps {
  teamId: string;
  limit: number;
  onClose: () => void;
}

/** Ventana emergente para ajustar cuántas amarillas suponen una sanción. */
function YellowCardsDialog({ teamId, limit, onClose }: YellowCardsDialogProps) {
  const [value, setValue] = useState(String(limit));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (yellowCardsLimit: number) => updateSeasonSettings(teamId, { yellowCardsLimit }),
    onSuccess: async () => {
      // El ajuste viaja con la temporada, que sale de la lista de equipos
      await queryClient.invalidateQueries({ queryKey: ["teams", "mine"] });
      onClose();
    },
  });

  // Se cierra con la tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(Number(value));
  }

  return (
    // Pulsar fuera de la ventana la cierra
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="yellow-dialog-title"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-3 rounded bg-white p-4 shadow-lg"
      >
        <h3 id="yellow-dialog-title" className="text-lg font-semibold">
          Amarillas para sanción
        </h3>
        <p className="text-sm text-gray-600">
          Se avisa de los jugadores que están a una amarilla de la sanción. Depende del reglamento
          de tu competición.
        </p>
        <div>
          <label htmlFor="yellowLimit" className="block text-sm font-medium text-gray-700">
            Amarillas que suponen una sanción
          </label>
          <input
            id="yellowLimit"
            type="number"
            min={2}
            max={10}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-24 rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SanctionBlockProps {
  teamId: string;
  // Jugadores a una amarilla de la sanción
  players: SquadPlayer[];
  limit: number;
  // true si el rol puede cambiar el ajuste (solo el entrenador principal)
  canEdit: boolean;
}

/**
 * Jugadores a una amarilla de la sanción, destacados en rojo y naranja. Si no
 * hay ninguno, un mensaje en verde. Con la ruedecita se ajusta cuántas
 * amarillas suponen una sanción.
 */
export function SanctionBlock({ teamId, players, limit, canEdit }: SanctionBlockProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="rounded border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Riesgo de sanción</h2>
        {canEdit && (
          <button
            type="button"
            aria-label="Ajustar las amarillas que suponen una sanción"
            title="Ajustar las amarillas que suponen una sanción"
            onClick={() => setDialogOpen(true)}
            className="rounded px-2 py-1 text-xl hover:bg-gray-100"
          >
            ⚙️
          </button>
        )}
      </div>

      {players.length === 0 ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800">
          No hay ningún jugador próximo a sanción.
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id}>
              <Link
                to={`/plantilla/${p.id}`}
                className="flex items-center gap-3 rounded border-2 border-red-500 bg-red-50 p-3 hover:bg-red-100"
              >
                <span aria-hidden="true" className="text-2xl">
                  🚨
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-red-900">
                    {p.nickname || `${p.name} ${p.surname}`}
                  </span>
                  <span className="block text-sm text-red-800">
                    Ya tiene {p.stats?.yellowCards} amarillas
                  </span>
                </span>
                <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                  Una más y sanción
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Una sanción llega con {limit} amarillas.
      </p>

      {dialogOpen && (
        <YellowCardsDialog teamId={teamId} limit={limit} onClose={() => setDialogOpen(false)} />
      )}
    </section>
  );
}
