import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addMatchEvent,
  deleteMatchEvent,
  type Match,
  type MatchEvent,
  type MatchEventType,
} from "../api/matches";
import { usePlayers } from "../hooks/usePlayers";

interface MatchEventsPanelProps {
  teamId: string;
  match: Match;
  canEdit: boolean;
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
      <svg {...common} className="h-5 w-5 text-green-700" viewBox="0 0 100 80" strokeWidth={3}>
        <path d="M12 68 V14 H88 V68" />
        <path d="M12 14 L22 23 H78 L88 14" />
        <path d="M22 23 V68 M78 23 V68" />
        <path d="M32 23 V68 M42 23 V68 M52 23 V68 M62 23 V68" strokeWidth={0.9} opacity={0.55} />
        <path d="M22 32 H78 M22 41 H78 M22 50 H78 M22 59 H78" strokeWidth={0.9} opacity={0.55} />
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

function MatchEventsPanel({ teamId, match, canEdit }: MatchEventsPanelProps) {
  const { data: players } = usePlayers(teamId);
  const queryClient = useQueryClient();
  const [type, setType] = useState<MatchEventType>("goal");
  const [minute, setMinute] = useState("1");
  const [side, setSide] = useState<"for" | "against">("for");
  const [player, setPlayer] = useState("");
  const [assist, setAssist] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [opponentJerseyNumber, setOpponentJerseyNumber] = useState("");
  const [penalty, setPenalty] = useState(false);
  const [ownGoal, setOwnGoal] = useState(false);
  const calledPlayers = useMemo(
    () => (players ?? []).filter((p) => (match.callup ?? []).includes(p.id)),
    [match.callup, players],
  );
  const nameOf = (id?: string) => {
    const p = players?.find((item) => item.id === id);
    return p ? p.nickname || `${p.name} ${p.surname}` : "Jugador";
  };
  const addMutation = useMutation({
    mutationFn: () =>
      addMatchEvent(teamId, match.id, {
        type,
        minute: Number(minute),
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
  const events = [...(match.events ?? [])].sort((a, b) => a.minute - b.minute);
  const canAdd = canEdit && match.status === "playing";
  const selectClass =
    "rounded border border-gray-300 bg-white px-2 py-2 text-sm";
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
  ) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-gray-600">
      {label}
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={!includeEmpty || label === "Goleador"}
      >
        {includeEmpty && <option value="">Seleccionar...</option>}
        {calledPlayers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname || `${p.name} ${p.surname}`}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="mt-6 rounded border border-gray-200 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Eventos del partido</h2>
        <span className="text-sm text-gray-500">
          {events.length} registrados
        </span>
      </div>
      {events.length > 0 ? (
        <ul className="mt-3 divide-y divide-gray-100 rounded border border-gray-200">
          {events.map((event) => {
            const onRight = isOnRight(event);
            const sideClass = onRight
              ? "col-start-3 justify-start text-left"
              : "col-start-1 justify-end text-right";
            return (
              <li
                key={event.id}
                className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-sm"
              >
                <span
                  className={`${sideClass} row-start-1 flex min-w-0 items-center gap-2`}
                >
                  {event.type === "substitution" ? (
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-green-700">
                        {nameOf(event.playerIn)} entra
                      </span>
                      <span className="block truncate text-xs font-normal text-red-700">
                        {nameOf(event.playerOut)} sale
                      </span>
                    </span>
                  ) : (
                    <span className="min-w-0" title={event.type === "goal" ? goalDescription(event) : eventDescriptionOf(event)}>
                      <span className="block truncate font-semibold">
                        {playerLabelOf(event)}
                      </span>
                      <span className="block truncate text-xs font-normal text-gray-600">
                        {eventDescriptionOf(event)}
                      </span>
                    </span>
                  )}
                </span>
                <span
                  className="col-start-2 row-start-1 flex flex-col items-center justify-center gap-0.5 text-gray-500"
                  title={eventLabels[event.type]}
                >
                  <EventIcon kind={iconKindOf(event)} />
                  <span className="font-semibold tabular-nums">
                    {event.minute}'
                  </span>
                </span>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(event.id)}
                    className="col-span-3 justify-self-end text-xs text-red-700 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          Todavía no hay eventos registrados.
        </p>
      )}
      {canAdd && (
        <form
          className="mt-4 space-y-3 border-t border-gray-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Minuto
              <input
                className={selectClass}
                type="number"
                min="0"
                max="120"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Evento
              <select
                className={selectClass}
                value={type}
                onChange={(e) => setType(e.target.value as MatchEventType)}
              >
                {Object.entries(eventLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {type === "goal" && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <label>
                  <input
                    type="radio"
                    checked={side === "for"}
                    onChange={() => setSide("for")}
                  />{" "}
                  A favor
                </label>
                <label>
                  <input
                    type="radio"
                    checked={side === "against"}
                    onChange={() => setSide("against")}
                  />{" "}
                  En contra
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {playerSelect(
                  player,
                  setPlayer,
                  side === "for" ? "Goleador" : "Jugador (si es propia)",
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
                      onChange={(e) => setOpponentJerseyNumber(e.target.value)}
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
              {playerSelect(playerIn, setPlayerIn, "Entra", false)}
              {playerSelect(playerOut, setPlayerOut, "Sale", false)}
            </div>
          )}
          {addMutation.isError && (
            <p className="text-sm text-red-600">{addMutation.error.message}</p>
          )}
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {addMutation.isPending ? "Guardando..." : "Añadir evento"}
          </button>
        </form>
      )}
    </section>
  );
}

export default MatchEventsPanel;
