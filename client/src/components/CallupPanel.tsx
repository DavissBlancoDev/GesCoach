import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveCallup, type Match } from "../api/matches";
import type { SquadPlayer } from "../api/players";
import { usePlayers } from "../hooks/usePlayers";
import {
  GROUP_LABELS,
  POSITIONS,
  POSITION_GROUP,
  POSITION_GROUPS,
} from "../lib/positions";
import { PLAYER_STATUS_LABELS } from "../lib/players";
import PositionBadge from "./PositionBadge";
import StatusIcon from "./StatusIcon";

interface CallupPanelProps {
  teamId: string;
  match: Match;
  // true si el rol puede editar la convocatoria (solo el entrenador principal)
  canEdit: boolean;
}

/** Orden dentro de un grupo: por posición (como en el campo) y luego por apellidos. */
const bySquadOrder = (a: SquadPlayer, b: SquadPlayer) =>
  POSITIONS.indexOf(a.mainPosition) - POSITIONS.indexOf(b.mainPosition) ||
  a.surname.localeCompare(b.surname, "es");

/**
 * Convocatoria de un partido: los jugadores de la plantilla agrupados por
 * posición (portero, defensas, centrocampistas y atacantes), con un contador
 * que bloquea al llegar al máximo de la competición.
 *
 * Solo se edita con el partido pendiente. Solo se pueden añadir jugadores
 * disponibles: para convocar a un lesionado hay que cambiarle antes el
 * estado en su ficha. El servidor comprueba las mismas reglas.
 */
function CallupPanel({ teamId, match, canEdit }: CallupPanelProps) {
  const { data: players, isPending, isError } = usePlayers(teamId);
  const queryClient = useQueryClient();

  // Jugadores marcados ahora mismo, por su identificador
  const [selected, setSelected] = useState<Set<string>>(() => new Set(match.callup ?? []));
  const [saved, setSaved] = useState(false);

  const editable = canEdit && match.status === "pending";
  const max = match.maxCallup;
  const full = max !== null && selected.size >= max;

  // Hay cambios sin guardar si la selección difiere de la que tiene el servidor
  const original = match.callup ?? [];
  const dirty = selected.size !== original.length || original.some((id) => !selected.has(id));

  const mutation = useMutation({
    mutationFn: () => saveCallup(teamId, match.id, [...selected]),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
    },
  });

  /** Marca o desmarca a un jugador. */
  function toggle(playerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
    setSaved(false);
  }

  // En edición salen todos los jugadores (menos los inactivos que no estén
  // convocados). En solo lectura, únicamente los convocados.
  const groups = POSITION_GROUPS.map((group) => ({
    group,
    players: (players ?? [])
      .filter((p) => POSITION_GROUP[p.mainPosition] === group)
      .filter((p) => (editable ? p.status !== "inactive" || selected.has(p.id) : selected.has(p.id)))
      .sort(bySquadOrder),
  })).filter((g) => g.players.length > 0);

  return (
    <section className="rounded border border-gray-200 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Convocatoria</h2>
        <span className="text-sm font-medium tabular-nums">
          {selected.size}
          {max !== null ? ` de ${max}` : ""} convocados
        </span>
      </div>

      {editable && (
        <p className="mb-3 mt-1 text-xs text-gray-500">
          Solo se pueden convocar jugadores disponibles. Para convocar a un lesionado o sancionado,
          cambia antes su estado en su ficha.
          {max === null && " En este tipo de partido no hay límite de convocados."}
        </p>
      )}
      {!editable && match.status !== "pending" && (
        <p className="mb-3 mt-1 text-xs text-gray-500">
          La convocatoria solo se puede cambiar con el partido pendiente.
        </p>
      )}

      {isPending && <p className="text-sm">Cargando plantilla...</p>}
      {isError && <p className="text-sm text-red-600">No se ha podido cargar la plantilla.</p>}

      {players && groups.length === 0 && (
        <p className="text-sm text-gray-600">
          {editable ? "No hay jugadores en la plantilla." : "Sin convocatoria todavía."}
        </p>
      )}

      <div className="space-y-4">
        {groups.map(({ group, players: groupPlayers }) => (
          <div key={group}>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">{GROUP_LABELS[group]}</h3>
            <ul className="space-y-1">
              {groupPlayers.map((p) => {
                const isSelected = selected.has(p.id);
                const unavailable = p.status !== "available";
                const blocked = editable && !isSelected && (unavailable || full);

                const content = (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                      {p.jerseyNumber ?? "–"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {p.nickname || `${p.name} ${p.surname}`}
                    </span>
                    {/* Motivo por el que no se puede convocar (o aviso si ya lo estaba) */}
                    {blocked && unavailable && (
                      <span className="text-xs text-gray-500">{PLAYER_STATUS_LABELS[p.status]}</span>
                    )}
                    {blocked && !unavailable && (
                      <span className="text-xs text-gray-500">Máximo alcanzado</span>
                    )}
                    {isSelected && unavailable && (
                      <span className="text-xs text-amber-700">
                        Ahora: {PLAYER_STATUS_LABELS[p.status].toLowerCase()}
                      </span>
                    )}
                    <StatusIcon status={p.status} />
                    <PositionBadge position={p.mainPosition} />
                    {editable && (
                      <span aria-hidden="true" className="w-4 text-center font-bold text-green-700">
                        {isSelected ? "✓" : ""}
                      </span>
                    )}
                  </>
                );

                // En solo lectura no hay botón: es una simple fila
                if (!editable) {
                  return (
                    <li key={p.id} className="flex items-center gap-2 rounded border border-gray-200 p-2">
                      {content}
                    </li>
                  );
                }

                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      disabled={blocked}
                      onClick={() => toggle(p.id)}
                      className={`flex w-full items-center gap-2 rounded border p-2 text-left disabled:opacity-50 ${
                        isSelected ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      {content}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {editable && (
        <div className="mt-4 space-y-2">
          {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
          {saved && <p className="text-sm text-green-700">Convocatoria guardada.</p>}
          <button
            type="button"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full rounded bg-green-700 px-4 py-3 text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Guardar convocatoria"}
          </button>
        </div>
      )}
    </section>
  );
}

export default CallupPanel;
