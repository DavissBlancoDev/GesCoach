import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addMatchEvent,
  deleteMatchEvent,
  type Match,
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
  const [penalty, setPenalty] = useState(false);
  const [ownGoal, setOwnGoal] = useState(false);

  const calledPlayers = useMemo(
    () => (players ?? []).filter((p) => (match.callup ?? []).includes(p.id)),
    [match.callup, players]
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
        assist: type === "goal" && side === "for" ? assist || undefined : undefined,
        playerIn: type === "substitution" ? playerIn : undefined,
        playerOut: type === "substitution" ? playerOut : undefined,
        penalty: type === "goal" ? penalty : false,
        ownGoal: type === "goal" ? ownGoal : false,
      }),
    onSuccess: async () => {
      setPlayer(""); setAssist(""); setPlayerIn(""); setPlayerOut(""); setPenalty(false); setOwnGoal(false);
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
      await queryClient.invalidateQueries({ queryKey: ["players", teamId] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteMatchEvent(teamId, match.id, eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
      await queryClient.invalidateQueries({ queryKey: ["players", teamId] });
    },
  });

  const events = [...(match.events ?? [])].sort((a, b) => a.minute - b.minute);
  const canAdd = canEdit && match.status === "playing";
  const selectClass = "rounded border border-gray-300 bg-white px-2 py-2 text-sm";
  const playerSelect = (value: string, onChange: (value: string) => void, label: string, includeEmpty = true) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-gray-600">
      {label}
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} required={!includeEmpty || label === "Goleador"}>
        {includeEmpty && <option value="">Seleccionar...</option>}
        {calledPlayers.map((p) => <option key={p.id} value={p.id}>{p.nickname || `${p.name} ${p.surname}`}</option>)}
      </select>
    </label>
  );

  return (
    <section className="mt-6 rounded border border-gray-200 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Eventos del partido</h2>
        <span className="text-sm text-gray-500">{events.length} registrados</span>
      </div>

      {events.length > 0 ? (
        <ul className="mt-3 divide-y divide-gray-100 rounded border border-gray-200">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-8 font-semibold tabular-nums text-gray-500">{event.minute}'</span>
              <span className="w-24 font-medium">{eventLabels[event.type]}</span>
              <span className="min-w-0 flex-1 truncate">
                {event.type === "goal" && `${event.side === "for" ? "A favor" : "En contra"} · ${event.player ? nameOf(event.player) : "Sin jugador"}${event.assist ? ` (asist. ${nameOf(event.assist)})` : ""}${event.penalty ? " · penalti" : ""}${event.ownGoal ? " · propia" : ""}`}
                {event.type === "yellow_card" && nameOf(event.player)}
                {event.type === "red_card" && nameOf(event.player)}
                {event.type === "substitution" && `${nameOf(event.playerIn)} entra · ${nameOf(event.playerOut)} sale`}
              </span>
              {canAdd && <button type="button" onClick={() => deleteMutation.mutate(event.id)} className="text-xs text-red-700 hover:underline">Eliminar</button>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-gray-600">Todavía no hay eventos registrados.</p>}

      {canAdd && (
        <form className="mt-4 space-y-3 border-t border-gray-100 pt-4" onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <label className="flex flex-col gap-1 text-xs text-gray-600">Minuto<input className={selectClass} type="number" min="0" max="120" value={minute} onChange={(e) => setMinute(e.target.value)} required /></label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">Evento<select className={selectClass} value={type} onChange={(e) => setType(e.target.value as MatchEventType)}>{Object.entries(eventLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          {type === "goal" && <>
            <div className="flex flex-wrap gap-4 text-sm"><label><input type="radio" checked={side === "for"} onChange={() => setSide("for")} /> A favor</label><label><input type="radio" checked={side === "against"} onChange={() => setSide("against")} /> En contra</label></div>
            <div className="grid gap-3 sm:grid-cols-2">{playerSelect(player, setPlayer, side === "for" ? "Goleador" : "Jugador (si es propia)")}{side === "for" && playerSelect(assist, setAssist, "Asistencia", true)}</div>
            <div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={penalty} onChange={(e) => setPenalty(e.target.checked)} /> Penalti</label><label><input type="checkbox" checked={ownGoal} onChange={(e) => setOwnGoal(e.target.checked)} /> En propia meta</label></div>
          </>}
          {(type === "yellow_card" || type === "red_card") && playerSelect(player, setPlayer, "Jugador", false)}
          {type === "substitution" && <div className="grid gap-3 sm:grid-cols-2">{playerSelect(playerIn, setPlayerIn, "Entra", false)}{playerSelect(playerOut, setPlayerOut, "Sale", false)}</div>}
          {addMutation.isError && <p className="text-sm text-red-600">{addMutation.error.message}</p>}
          <button type="submit" disabled={addMutation.isPending} className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50">{addMutation.isPending ? "Guardando..." : "Añadir evento"}</button>
        </form>
      )}
    </section>
  );
}

export default MatchEventsPanel;
