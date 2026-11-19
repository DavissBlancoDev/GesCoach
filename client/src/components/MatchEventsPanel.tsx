import { Fragment, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addMatchEvent,
  compareMatchEvents,
  deleteMatchEvent,
  type Match,
  type MatchEvent,
  type MatchEventType,
} from "../api/matches";
import { usePlayers } from "../hooks/usePlayers";

export interface MatchEventsPanelProps {
  teamId: string;
  match: Match;
  canEdit: boolean;
  currentMinute: number;
  currentMinuteLabel: string;
  half: 1 | 2;
  halfDuration: number;
  firstHalfEndMinute?: number;
  matchEndMinute?: number;
}
const eventLabels: Record<MatchEventType, string> = {
  goal: "Gol",
  yellow_card: "Amarilla",
  red_card: "Roja",
  substitution: "Cambio",
};
export type EventIconKind =
  | "goal"
  | "penalty"
  | "ownGoal"
  | "yellow"
  | "red"
  | "substitution";

export function EventIcon({ kind }: { kind: EventIconKind }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "yellow" || kind === "red") {
    return (
      <svg {...common} className="h-6 w-5">
        <rect
          x="4"
          y="1"
          width="16"
          height="22"
          rx="2"
          fill={kind === "yellow" ? "#facc15" : "#dc2626"}
          stroke="#374151"
          strokeWidth="1"
        />
      </svg>
    );
  }
  if (kind === "substitution")
    return (
      <svg {...common} className="h-5 w-5 text-blue-600">
        <path d="M7 7h10l-3-3M17 17H7l3 3M17 7l-3 3M7 17l3-3" />
      </svg>
    );
  if (kind === "penalty")
    return (
      <svg
        {...common}
        className="h-5 w-5 text-green-700"
        viewBox="0 0 100 80"
        strokeWidth={3}
      >
        <path d="M12 68 V14 H88 V68" />
        <path d="M12 14 L22 23 H78 L88 14" />
        <path d="M22 23 V68 M78 23 V68" />
        <path
          d="M32 23 V68 M42 23 V68 M52 23 V68 M62 23 V68"
          strokeWidth={0.9}
          opacity={0.55}
        />
        <path
          d="M22 32 H78 M22 41 H78 M22 50 H78 M22 59 H78"
          strokeWidth={0.9}
          opacity={0.55}
        />
        <path d="M12 68 H88" />
      </svg>
    );
  const color = kind === "ownGoal" ? "#dc2626" : "#16a34a";
  return (
    <svg {...common} className="h-5 w-5" style={{ color }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l3.6 2.6-1.4 4.2H9.8l-1.4-4.2z" />
      <path d="M12 3v4.5M15.6 10.1l4.9-1.4M14.2 14.3l2.8 4.2M9.8 14.3L7 18.5M8.4 10.1L3.5 8.7" />
    </svg>
  );
}

function iconKindOf(event: MatchEvent): EventIconKind {
  if (event.type === "yellow_card") return "yellow";
  if (event.type === "red_card") return "red";
  if (event.type === "substitution") return "substitution";
  if (event.penalty) return "penalty";
  if (event.ownGoal) return "ownGoal";
  return "goal";
}

function MatchEventsPanel({
  teamId,
  match,
  canEdit,
  currentMinute,
  currentMinuteLabel,
  half,
  halfDuration,
  firstHalfEndMinute,
  matchEndMinute,
}: MatchEventsPanelProps) {
  const { data: players } = usePlayers(teamId);
  const queryClient = useQueryClient();
  const [type, setType] = useState<MatchEventType>("goal");
  const [side, setSide] = useState<"for" | "against">("for");
  const [player, setPlayer] = useState("");
  const [assist, setAssist] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [opponentJerseyNumber, setOpponentJerseyNumber] = useState("");
  const [penalty, setPenalty] = useState(false);
  const [ownGoal, setOwnGoal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const calledPlayers = useMemo(
    () => (players ?? []).filter((p) => (match.callup ?? []).includes(p.id)),
    [match.callup, players],
  );
  const events = [...(match.events ?? [])].sort(compareMatchEvents);
  const halfSeparatorIndex = events.findIndex(
    (event) => event.period === "second" || event.minute > halfDuration,
  );
  const firstHalfEndLabel =
    (firstHalfEndMinute ?? halfDuration) > halfDuration
      ? `${halfDuration}'+${(firstHalfEndMinute ?? halfDuration) - halfDuration}'`
      : `${firstHalfEndMinute ?? halfDuration}'`;
  const matchEndLabel =
    (matchEndMinute ?? match.durationMinutes) > match.durationMinutes
      ? `${match.durationMinutes}'+${(matchEndMinute ?? match.durationMinutes) - match.durationMinutes}'`
      : `${matchEndMinute ?? match.durationMinutes}'`;
  const { currentOnFieldIds, currentBenchIds } = useMemo(() => {
    const onField = new Set(
      (match.lineup?.players ?? [])
        .filter((entry) => entry.starter)
        .map((entry) => entry.player),
    );

    for (const event of events) {
      if (event.type !== "substitution") continue;
      if (event.playerOut) onField.delete(event.playerOut);
      if (event.playerIn) onField.add(event.playerIn);
    }

    const calledIds = new Set(calledPlayers.map((player) => player.id));
    return {
      currentOnFieldIds: onField,
      currentBenchIds: new Set(
        [...calledIds].filter((playerId) => !onField.has(playerId)),
      ),
    };
  }, [calledPlayers, events, match.lineup?.players]);
  const nameOf = (id?: string) => {
    const p = players?.find((item) => item.id === id);
    return p ? p.nickname || `${p.name} ${p.surname}` : "Jugador";
  };
  const addMutation = useMutation({
    mutationFn: () =>
      addMatchEvent(teamId, match.id, {
        type,
        minute: currentMinute,
        period: half === 1 ? "first" : "second",
        side: type === "goal" ? side : undefined,
        player:
          type === "goal"
            ? player || undefined
            : type === "substitution"
              ? undefined
              : player || undefined,
        assist:
          type === "goal" && side === "for" ? assist || undefined : undefined,
        playerIn: type === "substitution" ? playerIn : undefined,
        playerOut: type === "substitution" ? playerOut : undefined,
        opponentJerseyNumber:
          type === "goal" && side === "against" && opponentJerseyNumber !== ""
            ? Number(opponentJerseyNumber)
            : undefined,
        penalty: type === "goal" ? penalty : false,
        ownGoal: type === "goal" ? ownGoal : false,
      }),
    onSuccess: async () => {
      setPlayer("");
      setAssist("");
      setPlayerIn("");
      setPlayerOut("");
      setOpponentJerseyNumber("");
      setPenalty(false);
      setOwnGoal(false);
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
      await queryClient.invalidateQueries({ queryKey: ["players", teamId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      deleteMatchEvent(teamId, match.id, eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
      await queryClient.invalidateQueries({ queryKey: ["players", teamId] });
    },
  });
  const canAdd = canEdit && match.status === "playing";
  const selectClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-600/10";
  const quickActionClass = (
    active: boolean,
    tone: "green" | "neutral" | "yellow" | "blue",
  ) => {
    const tones = {
      green: active
        ? "border-green-600 bg-green-700 text-white shadow-md shadow-green-700/20"
        : "border-green-200 bg-green-50 text-green-800 hover:border-green-400 hover:bg-green-100",
      neutral: active
        ? "border-slate-700 bg-slate-800 text-white shadow-md shadow-slate-900/15"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
      yellow: active
        ? "border-yellow-500 bg-yellow-400 text-slate-900 shadow-md shadow-yellow-500/20"
        : "border-yellow-200 bg-yellow-50 text-yellow-800 hover:border-yellow-400 hover:bg-yellow-100",
      blue: active
        ? "border-blue-600 bg-blue-700 text-white shadow-md shadow-blue-700/20"
        : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400 hover:bg-blue-100",
    };
    return `flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${tones[tone]}`;
  };
  const isForUs = (event: MatchEvent) =>
    event.type !== "goal" || event.side === "for";
  const isOnRight = (event: MatchEvent) =>
    match.venue === "away" ? isForUs(event) : !isForUs(event);
  const goalDescription = (event: MatchEvent) => {
    if (event.side === "against")
      return [
        "Gol rival",
        event.opponentJerseyNumber !== undefined
          ? `dorsal ${event.opponentJerseyNumber}`
          : undefined,
        event.player ? `propia de ${nameOf(event.player)}` : undefined,
        event.penalty ? "penalti" : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
    return [
      "Gol",
      event.player ? nameOf(event.player) : "Sin jugador",
      event.assist ? `asist. ${nameOf(event.assist)}` : undefined,
      event.penalty ? "penalti" : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const playerLabelOf = (event: MatchEvent) => {
    if (event.type === "goal" && event.side === "against") {
      return event.opponentJerseyNumber !== undefined
        ? `Dorsal ${event.opponentJerseyNumber}`
        : event.player
          ? nameOf(event.player)
          : "Rival";
    }
    return event.player ? nameOf(event.player) : "Sin jugador";
  };
  const eventDescriptionOf = (event: MatchEvent) => {
    if (event.type === "goal") {
      if (event.ownGoal) return "Gol en propia meta";
      if (event.side === "against") return "Gol rival";
      return event.penalty ? "Gol de penalti" : "Gol";
    }
    return event.type === "yellow_card" ? "Amarilla" : "Roja";
  };
  const playerSelect = (
    value: string,
    onChange: (value: string) => void,
    label: string,
    includeEmpty = true,
    availablePlayers = calledPlayers,
  ) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-gray-600">
      {label}
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={!includeEmpty || label === "Goleador"}
      >
        {includeEmpty && (
          <option value="" disabled={label === "Goleador" || !includeEmpty}>
            Seleccionar...
          </option>
        )}
        {!includeEmpty && (
          <option value="" disabled>
            Seleccionar...
          </option>
        )}
        {availablePlayers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname || `${p.name} ${p.surname}`}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="mt-6 flex flex-col overflow-hidden rounded-3xl border border-[#dfe7dc] bg-[#f7faf6] shadow-[0_10px_30px_rgba(48,76,56,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3ebe0] bg-white px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6c9b48]">
            Acta en directo
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            Eventos del partido
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {canAdd && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{" "}
              En directo
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {events.length} eventos
          </span>
        </div>
      </div>
      {events.length > 0 ? (
        <ul className="order-2 mx-5 mt-5 divide-y divide-[#edf1eb] overflow-hidden rounded-2xl border border-[#e1e8df] bg-white sm:mx-6">
          {match.status !== "pending" && (
            <li className="flex items-center justify-center gap-3 border-b border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38]">
              <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                0'
              </span>
              Comienzo del partido
            </li>
          )}
          {events.map((event, index) => {
            const sideClass = isOnRight(event)
              ? "col-start-3 justify-start text-center"
              : "col-start-1 flex-row-reverse justify-start text-center";
            return (
              <Fragment key={event.id}>
                {half === 2 &&
                  index ===
                    (halfSeparatorIndex < 0
                      ? events.length
                      : halfSeparatorIndex) && (
                    <li className="flex items-center justify-center gap-3 border-y border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38]">
                      <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                        {firstHalfEndLabel}
                      </span>
                      Fin del primer tiempo
                    </li>
                  )}
                <li className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 text-sm sm:px-4">
                  <span className="col-start-2 row-start-1 flex items-center justify-center text-slate-500">
                    <span className="flex h-9 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold tabular-nums text-slate-600">
                      {event.minute}'
                    </span>
                  </span>
                  <span
                    className={`${sideClass} row-start-1 flex min-w-0 items-center gap-2`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <EventIcon kind={iconKindOf(event)} />
                    </span>
                    {event.type === "substitution" ? (
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-800">
                          {nameOf(event.playerIn)} entra
                        </span>
                        <span className="block truncate text-xs font-normal text-slate-500">
                          {nameOf(event.playerOut)} sale
                        </span>
                      </span>
                    ) : (
                      <span
                        className="min-w-0"
                        title={
                          event.type === "goal"
                            ? goalDescription(event)
                            : eventDescriptionOf(event)
                        }
                      >
                        <span className="block truncate font-semibold text-slate-800">
                          {playerLabelOf(event)}
                          {event.type === "goal" &&
                            event.side === "for" &&
                            event.assist && (
                              <span className="font-normal text-gray-600">
                                {` (${nameOf(event.assist)})`}
                              </span>
                            )}
                        </span>
                        <span className="block truncate text-xs font-normal text-slate-500">
                          {eventDescriptionOf(event)}
                        </span>
                      </span>
                    )}
                  </span>
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(event.id)}
                      className="col-span-3 justify-self-end rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  )}
                </li>
              </Fragment>
            );
          })}
          {half === 2 && halfSeparatorIndex === events.length && (
            <li className="flex items-center justify-center gap-3 border-y border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38]">
              <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                {firstHalfEndLabel}
              </span>
              Fin del primer tiempo
            </li>
          )}
          {match.status === "finished" && (
            <li className="flex items-center justify-center gap-3 border-t border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38]">
              <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                {matchEndLabel}
              </span>
              Final del partido
            </li>
          )}
        </ul>
      ) : (
        <div className="order-2">
          {match.status !== "pending" && (
            <div className="mx-5 mt-5 flex items-center justify-center gap-3 rounded-xl border border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38] sm:mx-6">
              <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                0'
              </span>
              Comienzo del partido
            </div>
          )}
          <p className="mx-5 mt-5 rounded-2xl border border-dashed border-[#cbd8c8] bg-white px-4 py-6 text-center text-sm text-slate-500 sm:mx-6">
            Todavía no hay eventos registrados.
          </p>
          {half === 2 && (
            <div className="mx-5 mt-3 flex items-center justify-center gap-3 rounded-xl border-y border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38] sm:mx-6">
              <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                {firstHalfEndLabel}
              </span>
              Fin del primer tiempo
            </div>
          )}
          {match.status === "finished" && (
            <div className="mx-5 mt-3 flex items-center justify-center gap-3 rounded-xl border border-[#dfe7dc] bg-[#edf3e9] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#557d38] sm:mx-6">
              <span className="rounded-lg bg-white px-2 py-1 tabular-nums">
                {matchEndLabel}
              </span>
              Final del partido
            </div>
          )}
        </div>
      )}
      {canAdd && (
        <div className="order-1 px-5 pb-1 pt-5 sm:px-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("goal");
                setSide("for");
                setShowForm(true);
              }}
              className={quickActionClass(
                type === "goal" && side === "for",
                "green",
              )}
            >
              <span className="text-lg">◉</span> Gol a favor
            </button>
            <button
              type="button"
              onClick={() => {
                setType("goal");
                setSide("against");
                setShowForm(true);
              }}
              className={quickActionClass(
                type === "goal" && side === "against",
                "neutral",
              )}
            >
              <span className="text-lg">◉</span> Gol en contra
            </button>
            <button
              type="button"
              onClick={() => {
                setType("yellow_card");
                setShowForm(true);
              }}
              className={quickActionClass(
                type === "yellow_card" || type === "red_card",
                "yellow",
              )}
            >
              <span className="h-4 w-3 rounded-sm bg-yellow-400 ring-1 ring-yellow-600/40" />{" "}
              Tarjeta
            </button>
            <button
              type="button"
              onClick={() => {
                setType("substitution");
                setShowForm(true);
              }}
              className={quickActionClass(type === "substitution", "blue")}
            >
              <span className="text-lg">↔</span> Cambio
            </button>
          </div>
          {showForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4"
              onClick={() => setShowForm(false)}
            >
              <div
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-[#f7faf6] p-4 shadow-2xl sm:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6c9b48]">
                      Nuevo evento
                    </p>
                    <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                      Registrar {eventLabels[type].toLowerCase()}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl px-3 py-1 text-2xl leading-none text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>
                <form
                  className="mt-5 space-y-4 rounded-2xl border border-[#e1e8df] bg-white p-4 sm:p-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addMutation.mutate();
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                    <div className="flex flex-col gap-1 text-xs text-gray-600">
                      Minuto actual
                      <span className="mt-1 flex h-11 items-center justify-center rounded-xl bg-[#edf3e9] text-base font-bold tabular-nums text-[#173b2b]">
                        {currentMinuteLabel}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-gray-600">
                      Tipo de evento
                      <span className="mt-1 flex h-11 items-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700">
                        {eventLabels[type]}
                      </span>
                    </div>
                  </div>
                  {(type === "yellow_card" || type === "red_card") && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setType("yellow_card")}
                        className={quickActionClass(
                          type === "yellow_card",
                          "yellow",
                        )}
                      >
                        <span className="h-5 w-4 rounded-sm bg-yellow-400 ring-1 ring-yellow-600/40" />
                        Amarilla
                      </button>
                      <button
                        type="button"
                        onClick={() => setType("red_card")}
                        className={quickActionClass(
                          type === "red_card",
                          "neutral",
                        )}
                      >
                        <span className="h-5 w-4 rounded-sm bg-red-600 ring-1 ring-red-700/40" />
                        Roja
                      </button>
                    </div>
                  )}
                  {type === "goal" && (
                    <>
                      <div className="rounded-xl bg-[#edf3e9] px-3 py-2 text-sm font-semibold text-[#173b2b]">
                        {side === "for" ? "Gol a favor" : "Gol en contra"}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {playerSelect(
                          player,
                          setPlayer,
                          side === "for"
                            ? "Goleador"
                            : "Jugador (si es propia)",
                        )}
                        {side === "for" ? (
                          playerSelect(assist, setAssist, "Asistencia", true)
                        ) : (
                          <label className="flex flex-col gap-1 text-xs text-gray-600">
                            Dorsal rival (opcional)
                            <input
                              className={selectClass}
                              type="number"
                              min="0"
                              max="99"
                              value={opponentJerseyNumber}
                              onChange={(e) =>
                                setOpponentJerseyNumber(e.target.value)
                              }
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label>
                          <input
                            type="checkbox"
                            checked={penalty}
                            onChange={(e) => setPenalty(e.target.checked)}
                          />{" "}
                          Penalti
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={ownGoal}
                            onChange={(e) => setOwnGoal(e.target.checked)}
                          />{" "}
                          En propia meta
                        </label>
                      </div>
                    </>
                  )}
                  {(type === "yellow_card" || type === "red_card") &&
                    playerSelect(player, setPlayer, "Jugador", false)}
                  {type === "substitution" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {playerSelect(
                        playerIn,
                        setPlayerIn,
                        "Entra",
                        false,
                        calledPlayers.filter((player) =>
                          currentBenchIds.has(player.id),
                        ),
                      )}
                      {playerSelect(
                        playerOut,
                        setPlayerOut,
                        "Sale",
                        false,
                        calledPlayers.filter((player) =>
                          currentOnFieldIds.has(player.id),
                        ),
                      )}
                    </div>
                  )}
                  {addMutation.isError && (
                    <p className="text-sm text-red-600">
                      {addMutation.error.message}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="w-full rounded-xl bg-[#173b2b] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#173b2b]/15 transition hover:bg-[#24553c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addMutation.isPending ? "Guardando..." : "Añadir evento"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default MatchEventsPanel;
