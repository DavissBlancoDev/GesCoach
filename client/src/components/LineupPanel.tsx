import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FORMATION_OPTIONS,
  saveLineup,
  type Formation,
  type Match,
} from "../api/matches";
import type { SquadPlayer } from "../api/players";
import { usePlayers } from "../hooks/usePlayers";
import {
  POSITION_GROUP,
  POSITION_LABELS,
  type Position,
  type PositionGroup,
} from "../lib/positions";
import PositionBadge from "./PositionBadge";

interface LineupPanelProps {
  teamId: string;
  match: Match;
  canEdit: boolean;
}
type SlotSpec = {
  id: string;
  label: string;
  group: PositionGroup;
  preferred: Position[];
};

const positionForLabel: Record<string, Position[]> = {
  POR: ["portero"],
  LI: ["lateral_izquierdo"],
  LD: ["lateral_derecho"],
  CAI: ["carrilero_izquierdo", "lateral_izquierdo"],
  CAD: ["carrilero_derecho", "lateral_derecho"],
  DFC: ["central", "libero"],
  MI: ["interior_izquierdo", "extremo_izquierdo"],
  MD: ["interior_derecho", "extremo_derecho"],
  MC: ["mediocentro", "pivote", "interior_izquierdo", "interior_derecho"],
  PIV: ["pivote"],
  MP: ["mediapunta"],
  EI: ["extremo_izquierdo"],
  ED: ["extremo_derecho"],
  SD: ["segundo_delantero"],
  DC: ["delantero_centro"],
};

const groupForLabel: Record<string, PositionGroup> = {
  POR: "portero",
  LI: "defensa",
  LD: "defensa",
  CAI: "defensa",
  CAD: "defensa",
  DFC: "defensa",
  MI: "centrocampista",
  MD: "centrocampista",
  MC: "centrocampista",
  PIV: "centrocampista",
  MP: "centrocampista",
  EI: "atacante",
  ED: "atacante",
  SD: "atacante",
  DC: "atacante",
};

function row(prefix: string, labels: string[]): SlotSpec[] {
  return labels.map((label, index) => ({
    id: `${prefix}-${index + 1}`,
    label,
    group: groupForLabel[label],
    preferred: positionForLabel[label],
  }));
}

export const FORMATIONS: Record<Formation, SlotSpec[][]> = {
  "4-4-2": [
    row("def", ["LI", "DFC", "DFC", "LD"]),
    row("mid", ["MI", "MC", "MC", "MD"]),
    row("att", ["DC", "DC"]),
  ],
  "4-3-3": [
    row("def", ["LI", "DFC", "DFC", "LD"]),
    row("mid", ["MC", "PIV", "MC"]),
    row("att", ["EI", "DC", "ED"]),
  ],
  "4-2-3-1": [
    row("def", ["LI", "DFC", "DFC", "LD"]),
    row("mid", ["PIV", "PIV"]),
    row("att", ["MI", "MP", "MD"]),
    row("top", ["DC"]),
  ],
  "4-1-4-1": [
    row("def", ["LI", "DFC", "DFC", "LD"]),
    row("mid", ["PIV"]),
    row("att", ["MI", "MC", "MC", "MD"]),
    row("top", ["DC"]),
  ],
  "3-4-3": [
    row("def", ["DFC", "DFC", "DFC"]),
    row("mid", ["CAI", "MC", "MC", "CAD"]),
    row("att", ["EI", "DC", "ED"]),
  ],
  "3-5-2": [
    row("def", ["DFC", "DFC", "DFC"]),
    row("mid", ["CAI", "MC", "PIV", "MC", "CAD"]),
    row("att", ["DC", "DC"]),
  ],
  "5-2-3": [
    row("def", ["CAI", "DFC", "DFC", "DFC", "CAD"]),
    row("mid", ["PIV", "MC"]),
    row("att", ["EI", "DC", "ED"]),
  ],
  "5-3-2": [
    row("def", ["CAI", "DFC", "DFC", "DFC", "CAD"]),
    row("mid", ["MC", "PIV", "MC"]),
    row("att", ["SD", "DC"]),
  ],
  "5-4-1": [
    row("def", ["CAI", "DFC", "DFC", "DFC", "CAD"]),
    row("mid", ["MI", "MC", "MC", "MD"]),
    row("att", ["DC"]),
  ],
};

const goalkeeperSlot: SlotSpec = {
  id: "gk",
  label: "POR",
  group: "portero",
  preferred: ["portero"],
};
const allSlots = (formation: Formation) => [
  goalkeeperSlot,
  ...FORMATIONS[formation].flat(),
];
const displayName = (player: SquadPlayer) =>
  player.nickname || `${player.name} ${player.surname}`;
const byName = (a: SquadPlayer, b: SquadPlayer) =>
  displayName(a).localeCompare(displayName(b), "es", { sensitivity: "base" });
const slotPositionLabels: Record<string, string> = {
  POR: "Portero",
  LI: "Lateral izquierdo",
  LD: "Lateral derecho",
  CAI: "Carrilero izquierdo",
  CAD: "Carrilero derecho",
  DFC: "Central",
  MI: "Interior izquierdo",
  MD: "Interior derecho",
  MC: "Mediocentro",
  PIV: "Pivote",
  MP: "Mediapunta",
  EI: "Extremo izquierdo",
  ED: "Extremo derecho",
  SD: "Segundo delantero",
  DC: "Delantero centro",
};
const slotPositionLabel = (slot: SlotSpec) =>
  slotPositionLabels[slot.label] ?? POSITION_LABELS[slot.preferred[0]];

function initialAssignments(
  match: Match,
  formation: Formation,
): Record<string, string> {
  const starters = (match.lineup?.players ?? []).filter(
    (player) => player.starter,
  );
  const result: Record<string, string> = {};
  const goalkeeper =
    match.lineup?.goalkeeper ??
    starters.find((player) => player.player === match.lineup?.goalkeeper)
      ?.player;
  if (goalkeeper) result.gk = goalkeeper;
  const slots = allSlots(formation).filter((slot) => slot.id !== "gk");
  const remaining = starters.filter((player) => player.player !== goalkeeper);
  starters.forEach((player) => {
    if (
      player.slot &&
      player.player !== goalkeeper &&
      slots.some((slot) => slot.id === player.slot)
    )
      result[player.slot] = player.player;
  });
  const used = new Set(Object.values(result));
  remaining
    .filter((player) => !used.has(player.player))
    .forEach((player) => {
      const free = slots.find((slot) => !result[slot.id]);
      if (free) result[free.id] = player.player;
    });
  return result;
}

function LineupPanel({ teamId, match, canEdit }: LineupPanelProps) {
  const { data: players, isPending, isError } = usePlayers(teamId);
  const queryClient = useQueryClient();
  const lineup = match.lineup;
  const required = lineup?.startersRequired ?? 11;
  const editable = canEdit && (match.status === "pending" || match.status === "playing");
  const [formation, setFormation] = useState<Formation>(
    lineup?.formation ?? "4-4-2",
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    initialAssignments(match, lineup?.formation ?? "4-4-2"),
  );
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [jerseys, setJerseys] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (lineup?.players ?? [])
        .filter((player) => player.jerseyNumber !== undefined)
        .map((player) => [player.player, String(player.jerseyNumber)]),
    ),
  );
  const [saved, setSaved] = useState(false);

  const called = useMemo(() => {
    const ids = new Set(match.callup ?? []);
    return (players ?? []).filter((player) => ids.has(player.id));
  }, [match.callup, players]);
  const starterIds = new Set(Object.values(assignments));
  const starterPlayers = called.filter((player) => starterIds.has(player.id));

  function changeFormation(next: Formation) {
    setFormation(next);
    setAssignments((current) => {
      const nextSlots = allSlots(next);
      const nextAssignments: Record<string, string> = {};
      const ids = Object.values(current);
      if (current.gk) nextAssignments.gk = current.gk;
      ids
        .filter((id) => id !== current.gk)
        .forEach((id) => {
          const free = nextSlots.find(
            (slot) => slot.id !== "gk" && !nextAssignments[slot.id],
          );
          if (free) nextAssignments[free.id] = id;
        });
      return nextAssignments;
    });
    setOpenSlot(null);
    setSaved(false);
  }

  function assign(slotId: string, playerId: string) {
    setAssignments((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (next[key] === playerId) delete next[key];
      });
      next[slotId] = playerId;
      return next;
    });
    setOpenSlot(null);
    setShowOthers(false);
    setSaved(false);
  }

  function clearSlot(slotId: string) {
    setAssignments((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setSaved(false);
  }

  const overrideOf = (player: SquadPlayer): number | undefined => {
    const raw = jerseys[player.id];
    if (raw === undefined || raw === "") return undefined;
    const number = Number(raw);
    return Number.isInteger(number) && number >= 0 && number <= 99
      ? number
      : undefined;
  };
  const jerseyOf = (player: SquadPlayer) =>
    overrideOf(player) ?? player.jerseyNumber;
  const jerseyCounts = new Map<number, number>();
  called.forEach((player) => {
    const jersey = jerseyOf(player);
    if (jersey !== undefined)
      jerseyCounts.set(jersey, (jerseyCounts.get(jersey) ?? 0) + 1);
  });
  const duplicated = [...jerseyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
    .sort((a, b) => a - b);
  const withoutJersey = called.filter(
    (player) => jerseyOf(player) === undefined,
  ).length;

  const payload = () => ({
    formation,
    players: called
      .map((player) => {
        const slot = Object.entries(assignments).find(
          ([, id]) => id === player.id,
        )?.[0];
        const override = overrideOf(player);
        return {
          player: player.id,
          starter: Boolean(slot),
          slot: slot || undefined,
          jerseyNumber:
            override !== undefined && override !== player.jerseyNumber
              ? override
              : undefined,
        };
      })
      .sort((a, b) => a.player.localeCompare(b.player)),
    goalkeeper: assignments.gk ?? null,
  });
  const emptyPayload = () => ({
    formation: undefined,
    players: called.map((player) => ({
      player: player.id,
      starter: false,
      slot: undefined,
      jerseyNumber: undefined,
    })),
    goalkeeper: null,
  });
  const serverPayload = JSON.stringify({
    formation: lineup?.formation ?? null,
    players: (lineup?.players ?? [])
      .map((player) => ({
        player: player.player,
        starter: player.starter,
        slot: player.slot,
        jerseyNumber: player.jerseyNumber,
      }))
      .sort((a, b) => a.player.localeCompare(b.player)),
    goalkeeper: lineup?.goalkeeper ?? null,
  });
  const dirty = JSON.stringify(payload()) !== serverPayload;
  const mutation = useMutation({
    mutationFn: (
      data?: ReturnType<typeof payload> | ReturnType<typeof emptyPayload>,
    ) => saveLineup(teamId, match.id, data ?? payload()),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
    },
  });

  function deleteLineup() {
    if (!window.confirm("¿Borrar la alineación actual?")) return;
    setAssignments({});
    setJerseys({});
    setSaved(false);
    mutation.mutate(emptyPayload());
  }

  function candidatesFor(slot: SlotSpec) {
    const usedElsewhere = new Set(
      Object.entries(assignments)
        .filter(([id]) => id !== slot.id)
        .map(([, player]) => player),
    );
    const expectedPosition = slot.preferred[0];
    const priorityOf = (player: SquadPlayer) =>
      player.mainPosition === expectedPosition
        ? 0
        : player.secondaryPositions.includes(expectedPosition)
          ? 1
          : 2;
    return called
      .filter((player) => !usedElsewhere.has(player.id))
      .filter((player) =>
        showOthers
          ? POSITION_GROUP[player.mainPosition] !== slot.group
          : POSITION_GROUP[player.mainPosition] === slot.group,
      )
      .sort((a, b) => {
        return (
          priorityOf(a) - priorityOf(b) ||
          Number(POSITION_GROUP[b.mainPosition] === slot.group) -
            Number(POSITION_GROUP[a.mainPosition] === slot.group) ||
          byName(a, b)
        );
      });
  }

  function candidateList(slot: SlotSpec) {
    const candidates = candidatesFor(slot);
    if (!openSlot || openSlot !== slot.id) return null;
    return (
      <div className="mt-2 rounded border border-green-200 bg-white p-2 shadow-lg">
        <p className="mb-1 text-xs font-medium text-gray-600">
          {showOthers
            ? "Todos los convocados"
            : "Jugadores de esta demarcación"}
        </p>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="p-2 text-xs text-gray-500">
              No hay jugadores disponibles.
            </p>
          ) : (
            candidates.map((player) => {
              const expectedPosition = slot.preferred[0];
              const isPrimary = player.mainPosition === expectedPosition;
              const isSecondary =
                !isPrimary &&
                player.secondaryPositions.includes(expectedPosition);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => assign(slot.id, player.id)}
                  className={`flex w-full items-center gap-2 rounded border p-2 text-left text-xs hover:bg-green-50 ${isPrimary ? "border-green-500 bg-green-50" : isSecondary ? "border-amber-400 bg-amber-50" : "border-transparent"}`}
                >
                  <span className="w-6 text-center font-bold">
                    {player.jerseyNumber ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {displayName(player)}
                  </span>
                  <PositionBadge position={player.mainPosition} />
                  {isPrimary && (
                    <span className="font-bold text-green-700">Principal</span>
                  )}
                  {isSecondary && (
                    <span className="font-semibold text-amber-700">
                      Secundaria
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const renderSlot = (slot: SlotSpec) => {
    const player = called.find((item) => item.id === assignments[slot.id]);
    return (
      <div key={slot.id} className="flex w-full justify-center">
        <button
          type="button"
          disabled={!editable}
          onClick={() => {
            setOpenSlot(openSlot === slot.id ? null : slot.id);
            setShowOthers(false);
          }}
          className={`flex min-h-20 w-full flex-col items-center justify-center border-0 bg-transparent p-1 text-center text-xs transition ${editable ? "hover:scale-105" : ""}`}
        >
          {player ? (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ring-2 ring-white shadow-lg">
                {jerseyOf(player) ?? "–"}
              </span>
              <span className="max-w-full truncate font-bold text-white drop-shadow">
                {displayName(player)}
              </span>
              <span className="text-[10px] font-semibold text-white drop-shadow">
                {slotPositionLabel(slot)}
              </span>
            </>
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white bg-green-950/50 text-xs font-bold text-white">
                {slot.label}
              </span>
              <span className="font-semibold text-white drop-shadow">
                {slotPositionLabel(slot)}
              </span>
            </>
          )}
        </button>
      </div>
    );
  };

  if (match.callup?.length === 0)
    return (
      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Alineación</h2>
        <p className="mt-1 text-sm text-gray-600">
          Primero hay que hacer la convocatoria.
        </p>
      </section>
    );

  const check = (ok: boolean, text: string) => (
    <li className={ok ? "text-green-700" : "text-amber-700"}>
      <span aria-hidden="true">{ok ? "✓" : "⚠️"}</span> {text}
    </li>
  );
  const substitutes = called
    .filter((player) => !starterIds.has(player.id))
    .sort(byName);

  return (
    <section className="rounded border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Alineación</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="formation" className="text-sm font-medium">
            Sistema
          </label>
          <select
            id="formation"
            value={formation}
            disabled={!editable}
            onChange={(event) =>
              changeFormation(event.target.value as Formation)
            }
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {FORMATION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      {isPending && <p className="mt-2 text-sm">Cargando plantilla...</p>}
      {isError && (
        <p className="mt-2 text-sm text-red-600">
          No se ha podido cargar la plantilla.
        </p>
      )}
      {editable && (
        <p className="mb-3 mt-1 text-xs text-gray-500">
          Pulsa una posición para elegir un jugador. Los que tienen esa
          demarcación aparecen primero; usa «Elegir a otro jugador» para buscar
          en el resto de la plantilla.
        </p>
      )}
      {editable && (
        <ul className="mb-3 space-y-1 text-sm">
          {check(
            starterPlayers.length === required,
            `Titulares: ${starterPlayers.length} de ${required}`,
          )}
          {check(
            Boolean(assignments.gk),
            assignments.gk ? "Portero: asignado" : "Portero: sin asignar",
          )}
          {check(
            withoutJersey === 0 && duplicated.length === 0,
            withoutJersey === 0 && duplicated.length === 0
              ? "Dorsales: todos asignados y distintos"
              : `${withoutJersey > 0 ? `${withoutJersey} sin dorsal` : ""}${duplicated.length > 0 ? ` · repetidos: ${duplicated.join(", ")}` : ""}`,
          )}
        </ul>
      )}
      <div className="w-full max-w-full overflow-x-auto rounded-xl">
        <div className="relative h-[40rem] w-full min-w-0 max-w-full overflow-visible rounded-xl border-4 border-white bg-green-700 p-3 shadow-inner">
          <div className="pointer-events-none absolute inset-0 border-2 border-white/90" />
          <div className="pointer-events-none absolute inset-y-[22%] left-0 w-28 border-y-2 border-r-2 border-white/70" />
          <div className="pointer-events-none absolute inset-y-[22%] right-0 w-28 border-y-2 border-l-2 border-white/70" />
          <div className="pointer-events-none absolute inset-y-[35%] left-0 w-14 border-y-2 border-r-2 border-white/70" />
          <div className="pointer-events-none absolute inset-y-[35%] right-0 w-14 border-y-2 border-l-2 border-white/70" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-white/70" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
          <div className="pointer-events-none absolute -left-2 top-[42%] h-[16%] w-2 border-2 border-white/90" />
          <div className="pointer-events-none absolute -right-2 top-[42%] h-[16%] w-2 border-2 border-white/90" />
          <div className="relative flex h-full w-full items-stretch justify-between gap-4">
            <div className="absolute left-0 top-1/2 z-10 flex w-24 -translate-y-1/2 items-center justify-center">
              {renderSlot(goalkeeperSlot)}
            </div>
            <div className="ml-24 flex h-full min-w-0 flex-1 items-stretch justify-between gap-4">
              {FORMATIONS[formation].map((rowSlots, index) => (
                <div
                  key={index}
                  className="flex min-w-0 flex-1 flex-col items-center justify-evenly gap-1"
                >
                  {rowSlots.map(renderSlot)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {editable &&
        openSlot &&
        (() => {
          const slot = allSlots(formation).find((item) => item.id === openSlot);
          if (!slot) return null;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setOpenSlot(null)}
            >
              <div
                className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      Elegir jugador para {slot.label}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {showOthers
                        ? "Jugadores de otras demarcaciones"
                        : "Jugadores de esta demarcación"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenSlot(null)}
                    className="rounded px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
                    aria-label="Cerrar selector"
                  >
                    ×
                  </button>
                </div>
                {candidateList(slot)}
                {assignments[slot.id] && (
                  <button
                    type="button"
                    onClick={() => {
                      clearSlot(slot.id);
                      setOpenSlot(null);
                    }}
                    className="mt-3 w-full rounded border border-red-600 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Quitar jugador
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowOthers((current) => !current)}
                  className="mt-3 w-full rounded border border-green-700 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
                >
                  {showOthers
                    ? "Volver a jugadores de la demarcación"
                    : "Elegir a otro jugador"}
                </button>
              </div>
            </div>
          );
        })()}
      {editable && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">
            Dorsales del partido (opcional):
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {called.map((player) => (
              <label
                key={player.id}
                className="flex items-center gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate">
                  {displayName(player)}
                </span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  placeholder={
                    player.jerseyNumber !== undefined
                      ? String(player.jerseyNumber)
                      : "–"
                  }
                  value={jerseys[player.id] ?? ""}
                  onChange={(event) => {
                    setJerseys((current) => ({
                      ...current,
                      [player.id]: event.target.value,
                    }));
                    setSaved(false);
                  }}
                  className={`h-8 w-14 rounded border px-1 text-center ${duplicated.includes(jerseyOf(player) ?? -1) ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          Banquillo ({substitutes.length})
        </h3>
        {substitutes.length === 0 ? (
          <p className="text-sm text-gray-600">Sin suplentes.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {substitutes.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold">
                  {jerseyOf(player) ?? "–"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-sm">
                    {displayName(player)}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {POSITION_LABELS[player.mainPosition]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editable && (
        <div className="mt-4 space-y-2">
          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error.message}</p>
          )}
          {saved && (
            <p className="text-sm text-green-700">Alineación guardada.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={
                !dirty ||
                starterPlayers.length > required ||
                duplicated.length > 0 ||
                mutation.isPending
              }
              onClick={() => mutation.mutate()}
              className="flex-1 rounded bg-green-700 px-4 py-3 text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Guardando..." : "Guardar alineación"}
            </button>
            <button
              type="button"
              disabled={starterPlayers.length === 0 || mutation.isPending}
              onClick={deleteLineup}
              className="rounded border border-red-600 px-4 py-3 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Borrar alineación
            </button>
          </div>
          {starterPlayers.length > required && (
            <p className="text-xs text-red-600">
              Reduce el número de titulares antes de guardar.
            </p>
          )}
        </div>
      )}
      {!editable && match.status !== "pending" && (
        <p className="mt-3 text-xs text-gray-500">
          La alineación no se puede cambiar con este estado del partido.
        </p>
      )}
    </section>
  );
}

export default LineupPanel;
