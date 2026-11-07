import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveLineup, type Match } from "../api/matches";
import type { SquadPlayer } from "../api/players";
import { usePlayers } from "../hooks/usePlayers";
import { GROUP_LABELS, POSITIONS, POSITION_GROUP, POSITION_GROUPS } from "../lib/positions";
import PositionBadge from "./PositionBadge";

interface LineupPanelProps {
  teamId: string;
  match: Match;
  // true si el rol puede hacer la alineación (solo el entrenador principal)
  canEdit: boolean;
}

/** Orden dentro de un grupo: por posición (como en el campo) y luego por apellidos. */
const bySquadOrder = (a: SquadPlayer, b: SquadPlayer) =>
  POSITIONS.indexOf(a.mainPosition) - POSITIONS.indexOf(b.mainPosition) ||
  a.surname.localeCompare(b.surname, "es");

const displayName = (p: SquadPlayer) => p.nickname || `${p.name} ${p.surname}`;

/**
 * Alineación rápida de un partido: de entre los convocados se eligen los
 * titulares y se marca al portero. Cada uno juega con su dorsal fijo; si no
 * tiene o se quiere otro para este partido, se escribe aquí, sin cambiar el
 * dorsal fijo del jugador.
 *
 * Solo se edita con el partido pendiente. Para empezar el partido tiene que
 * estar completa (el servidor lo comprueba): los titulares que marca la
 * modalidad, un portero entre ellos y todos con un dorsal distinto.
 *
 * Este componente se monta con una "key" que cambia cuando cambia la
 * convocatoria, para que su estado se reinicie con los convocados nuevos.
 */
function LineupPanel({ teamId, match, canEdit }: LineupPanelProps) {
  const { data: players, isPending, isError } = usePlayers(teamId);
  const queryClient = useQueryClient();

  const lineup = match.lineup;
  const required = lineup?.startersRequired ?? 11;
  const editable = canEdit && match.status === "pending";

  // Estado de la edición, inicializado con lo que tiene guardado el servidor
  const [starters, setStarters] = useState<Set<string>>(
    () => new Set((lineup?.players ?? []).filter((p) => p.starter).map((p) => p.player))
  );
  const [goalkeeper, setGoalkeeper] = useState<string | null>(lineup?.goalkeeper ?? null);
  // Dorsal escrito para este partido, como texto, por jugador
  const [jerseys, setJerseys] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (lineup?.players ?? [])
        .filter((p) => p.jerseyNumber !== undefined)
        .map((p) => [p.player, String(p.jerseyNumber)])
    )
  );
  const [saved, setSaved] = useState(false);

  const calledUpIds = match.callup ?? [];
  const called = (players ?? []).filter((p) => calledUpIds.includes(p.id));

  /** Dorsal escrito para este partido, si es válido. */
  const overrideOf = (p: SquadPlayer): number | undefined => {
    const raw = jerseys[p.id];
    if (raw === undefined || raw === "") return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 99 ? n : undefined;
  };
  /** Dorsal con el que juega: el del partido si lo hay y, si no, el fijo. */
  const jerseyOf = (p: SquadPlayer): number | undefined => overrideOf(p) ?? p.jerseyNumber;

  // Comprobaciones en directo (el servidor vuelve a comprobarlas)
  const counts = new Map<number, number>();
  for (const p of called) {
    const jersey = jerseyOf(p);
    if (jersey !== undefined) counts.set(jersey, (counts.get(jersey) ?? 0) + 1);
  }
  const duplicated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([jersey]) => jersey)
    .sort((a, b) => a - b);
  const withoutJersey = called.filter((p) => jerseyOf(p) === undefined).length;
  const goalkeeperPlayer = called.find((p) => p.id === goalkeeper);

  /** Lo que se enviaría al servidor ahora mismo. */
  const payload = () => ({
    players: called
      .map((p) => {
        const override = overrideOf(p);
        return {
          player: p.id,
          starter: starters.has(p.id),
          // Solo se guarda el dorsal del partido si es distinto del fijo
          jerseyNumber: override !== undefined && override !== p.jerseyNumber ? override : undefined,
        };
      })
      .sort((a, b) => a.player.localeCompare(b.player)),
    goalkeeper,
  });

  // Hay cambios sin guardar si lo escrito difiere de lo que tiene el servidor
  const serverPayload = JSON.stringify({
    players: [...(lineup?.players ?? [])]
      .map((p) => ({ player: p.player, starter: p.starter, jerseyNumber: p.jerseyNumber }))
      .sort((a, b) => a.player.localeCompare(b.player)),
    goalkeeper: lineup?.goalkeeper ?? null,
  });
  const dirty = JSON.stringify(payload()) !== serverPayload;

  const mutation = useMutation({
    mutationFn: () => saveLineup(teamId, match.id, payload()),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
    },
  });

  /** Marca o desmarca a un titular. Quien deja de serlo deja también de ser portero. */
  function toggleStarter(playerId: string) {
    setStarters((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        if (goalkeeper === playerId) setGoalkeeper(null);
      } else {
        next.add(playerId);
      }
      return next;
    });
    setSaved(false);
  }

  function setJersey(playerId: string, value: string) {
    setJerseys((prev) => ({ ...prev, [playerId]: value }));
    setSaved(false);
  }

  // Convocatoria vacía: no hay a quién alinear
  if (calledUpIds.length === 0) {
    return (
      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Alineación</h2>
        <p className="mt-1 text-sm text-gray-600">Primero hay que hacer la convocatoria.</p>
      </section>
    );
  }

  // En solo lectura se enseñan los titulares y, aparte, los suplentes
  const starterPlayers = called.filter((p) => starters.has(p.id)).sort(bySquadOrder);
  const substitutes = called.filter((p) => !starters.has(p.id)).sort(bySquadOrder);

  const readOnlyRow = (p: SquadPlayer) => (
    <li key={p.id} className="flex items-center gap-2 rounded border border-gray-200 p-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
        {jerseyOf(p) ?? "–"}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{displayName(p)}</span>
      {goalkeeper === p.id && (
        <span title="Portero" className="text-xs">
          🧤 Portero
        </span>
      )}
      <PositionBadge position={p.mainPosition} />
    </li>
  );

  // En edición, los convocados se agrupan por posición
  const groups = POSITION_GROUPS.map((group) => ({
    group,
    players: called.filter((p) => POSITION_GROUP[p.mainPosition] === group).sort(bySquadOrder),
  })).filter((g) => g.players.length > 0);

  const check = (ok: boolean, text: string) => (
    <li className={ok ? "text-green-700" : "text-amber-700"}>
      <span aria-hidden="true">{ok ? "✅" : "⚠️"}</span> {text}
    </li>
  );

  return (
    <section className="rounded border border-gray-200 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Alineación</h2>
        <span className="text-sm font-medium tabular-nums">
          {starters.size} de {required} titulares
        </span>
      </div>

      {isPending && <p className="mt-2 text-sm">Cargando plantilla...</p>}
      {isError && <p className="mt-2 text-sm text-red-600">No se ha podido cargar la plantilla.</p>}

      {editable && players && (
        <>
          <p className="mb-3 mt-1 text-xs text-gray-500">
            Elige a los titulares de entre los convocados y marca al portero. Cada uno juega con su
            dorsal fijo; si no tiene, o quieres otro para este partido, escríbelo. El dorsal fijo del
            jugador no cambia.
          </p>

          <ul className="mb-4 space-y-1 text-sm">
            {check(starters.size === required, `Titulares: ${starters.size} de ${required}`)}
            {check(
              Boolean(goalkeeperPlayer),
              goalkeeperPlayer ? `Portero: ${displayName(goalkeeperPlayer)}` : "Portero: sin marcar"
            )}
            {check(
              withoutJersey === 0 && duplicated.length === 0,
              withoutJersey === 0 && duplicated.length === 0
                ? "Dorsales: todos asignados y distintos"
                : [
                    withoutJersey > 0 ? `${withoutJersey} sin dorsal` : "",
                    duplicated.length > 0 ? `repetidos: ${duplicated.join(", ")}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
            )}
          </ul>

          <div className="space-y-4">
            {groups.map(({ group, players: groupPlayers }) => (
              <div key={group}>
                <h3 className="mb-1 text-sm font-semibold text-gray-700">{GROUP_LABELS[group]}</h3>
                <ul className="space-y-2">
                  {groupPlayers.map((p) => {
                    const isStarter = starters.has(p.id);
                    const isGoalkeeper = goalkeeper === p.id;
                    const jersey = jerseyOf(p);
                    const isDuplicated = jersey !== undefined && duplicated.includes(jersey);
                    return (
                      <li key={p.id} className="rounded border border-gray-200 p-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            inputMode="numeric"
                            aria-label={`Dorsal de ${displayName(p)} en este partido`}
                            // El dorsal fijo se ve como pista mientras no se escriba otro
                            placeholder={p.jerseyNumber !== undefined ? String(p.jerseyNumber) : "–"}
                            value={jerseys[p.id] ?? ""}
                            onChange={(e) => setJersey(p.id, e.target.value)}
                            className={`h-9 w-14 shrink-0 rounded border px-1 text-center ${
                              isDuplicated
                                ? "border-red-500 bg-red-50"
                                : jersey === undefined
                                  ? "border-amber-400 bg-amber-50"
                                  : "border-gray-300"
                            }`}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">{displayName(p)}</span>
                          <PositionBadge position={p.mainPosition} />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            aria-pressed={isStarter}
                            disabled={!isStarter && starters.size >= required}
                            onClick={() => toggleStarter(p.id)}
                            className={`rounded border px-3 py-1 text-sm disabled:opacity-50 ${
                              isStarter
                                ? "border-green-700 bg-green-700 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            Titular
                          </button>
                          {isStarter && (
                            <button
                              type="button"
                              aria-pressed={isGoalkeeper}
                              onClick={() => {
                                setGoalkeeper(isGoalkeeper ? null : p.id);
                                setSaved(false);
                              }}
                              className={`rounded border px-3 py-1 text-sm ${
                                isGoalkeeper
                                  ? "border-amber-500 bg-amber-500 text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              🧤 Portero
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
            {saved && <p className="text-sm text-green-700">Alineación guardada.</p>}
            <button
              type="button"
              disabled={!dirty || duplicated.length > 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="w-full rounded bg-green-700 px-4 py-3 text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Guardando..." : "Guardar alineación"}
            </button>
            {duplicated.length > 0 && (
              <p className="text-xs text-red-600">
                Corrige los dorsales repetidos para poder guardar.
              </p>
            )}
          </div>
        </>
      )}

      {!editable && players && (
        <>
          {!canEdit && match.status === "pending" && starterPlayers.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">La alineación todavía no está hecha.</p>
          ) : (
            <div className="mt-2 space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-gray-700">Titulares</h3>
                {starterPlayers.length === 0 ? (
                  <p className="text-sm text-gray-600">Sin titulares.</p>
                ) : (
                  <ul className="space-y-1">{starterPlayers.map(readOnlyRow)}</ul>
                )}
              </div>
              {substitutes.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-700">Suplentes</h3>
                  <ul className="space-y-1">{substitutes.map(readOnlyRow)}</ul>
                </div>
              )}
              {match.status !== "pending" && (
                <p className="text-xs text-gray-500">
                  La alineación solo se puede cambiar con el partido pendiente.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default LineupPanel;
