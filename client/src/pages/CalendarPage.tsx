import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCalendarNote, deleteCalendarNote } from "../api/calendarNotes";
import { useCalendarNotes } from "../hooks/useCalendarNotes";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { useTrainings } from "../hooks/useTrainings";
import { WEEKDAYS, buildEvents, dayHeading, monthCells, monthTitle } from "../lib/calendar";
import { canManageTrainings, todayIso } from "../lib/trainings";
import { RESULT_STYLES } from "../lib/matches";

const LEGEND = [
  { label: "Entreno", className: "border-blue-300 bg-blue-100" },
  { label: "Partido", className: "border-purple-300 bg-purple-100" },
  { label: "Nota / evento", className: "border-amber-300 bg-amber-100" },
  { label: "Victoria", className: RESULT_STYLES.win.box },
  { label: "Empate", className: RESULT_STYLES.draw.box },
  { label: "Derrota", className: RESULT_STYLES.loss.box },
  { label: "Suspendido", className: "border-gray-300 bg-gray-100" },
];

function CalendarPage() {
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const trainings = useTrainings(teamId);
  const matches = useMatches(teamId);
  const notes = useCalendarNotes(teamId);
  const queryClient = useQueryClient();
  const now = new Date();
  const today = todayIso();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState(today);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteTime, setNoteTime] = useState("");
  const [noteDetails, setNoteDetails] = useState("");

  const createNoteMutation = useMutation({
    mutationFn: () => createCalendarNote(teamId as string, {
      date: selectedDay,
      startTime: noteTime || undefined,
      title: noteTitle.trim(),
      details: noteDetails.trim() || undefined,
    }),
    onSuccess: async () => {
      setNoteTitle(""); setNoteTime(""); setNoteDetails(""); setShowNoteForm(false);
      await queryClient.invalidateQueries({ queryKey: ["calendar-notes", teamId] });
    },
  });
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCalendarNote(teamId as string, noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar-notes", teamId] }),
  });

  if (!current || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  const events = buildEvents(trainings.data ?? [], matches.data ?? [], current.currentSeason.division, notes.data ?? []);
  const cells = monthCells(view.year, view.month);
  const selectedEvents = events.get(selectedDay) ?? [];
  const canAddNotes = canManageTrainings(current.role);
  const loading = trainings.isPending || matches.isPending || notes.isPending;
  const failed = trainings.isError || matches.isError || notes.isError;

  function goToMonth(delta: number) {
    setView((prev) => { const date = new Date(prev.year, prev.month + delta, 1); return { year: date.getFullYear(), month: date.getMonth() }; });
  }
  function selectDay(day: string) { setSelectedDay(day); setShowNoteForm(false); }
  function isSelected(day: string) { return selectedDay === day; }

  return (
    <main className="mt-4 py-4" style={{ marginInline: "clamp(1rem, 7vw, 100px)" }}>
      <h1 className="mb-3 text-2xl font-bold">Calendario</h1>
      <div className="mb-4 flex items-center gap-2">
        <button type="button" aria-label="Mes anterior" onClick={() => goToMonth(-1)} className="h-10 w-10 rounded border border-gray-300 text-xl">‹</button>
        <h2 className="flex-1 text-center text-lg font-semibold">{monthTitle(view.year, view.month)}</h2>
        <button type="button" aria-label="Mes siguiente" onClick={() => goToMonth(1)} className="h-10 w-10 rounded border border-gray-300 text-xl">›</button>
        <button type="button" onClick={() => { setView({ year: now.getFullYear(), month: now.getMonth() }); selectDay(today); }} className="rounded border border-gray-300 px-3 py-2 text-sm">Hoy</button>
      </div>
      {loading && <p className="mb-2 text-sm text-gray-600">Cargando...</p>}
      {failed && <p className="mb-2 text-sm text-red-600">No se han podido cargar todos los datos.</p>}

      <div className="flex flex-row items-start gap-6">
        <section className="min-w-0 flex-1">
          <div className="grid grid-cols-7 border-l border-t border-gray-200">
            {WEEKDAYS.map((day) => <div key={day} className="border-b border-r border-gray-200 bg-gray-50 py-1 text-center text-xs font-semibold text-gray-600">{day}</div>)}
            {cells.map((cell, index) => {
              if (cell.day === null) return <div key={index} className="min-h-28 border-b border-r border-gray-200 bg-gray-50" />;
              const key = cell.key as string;
              const dayEvents = events.get(key) ?? [];
              return <div key={key} role="button" tabIndex={0} onClick={() => selectDay(key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectDay(key); }} className={`min-h-28 cursor-pointer border-b border-r border-gray-200 p-1 transition hover:bg-green-50 ${isSelected(key) ? "bg-green-50 ring-2 ring-inset ring-green-600" : ""}`}>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${key === today ? "bg-green-700 font-bold text-white" : "text-gray-600"}`}>{cell.day}</span>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((event) => event.kind === "note" ? <div key={event.key} title={event.title} className={`block truncate rounded border px-1 py-0.5 text-xs ${event.className}`}><span className="font-semibold">{event.time && `${event.time} `}</span>{event.label}</div> : <Link key={event.key} to={event.href} title={event.title} onClick={(e) => e.stopPropagation()} className={`block truncate rounded border px-1 py-0.5 text-xs ${event.className}`}>{event.time && <span className="font-semibold">{event.time} </span>}{event.label}</Link>)}
                  {dayEvents.length === 0 && <span className="flex h-10 items-center justify-center text-2xl font-light text-gray-300">+</span>}
                </div>
              </div>;
            })}
          </div>
        </section>

        <aside className="w-80 shrink-0 rounded border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{dayHeading(selectedDay)}</h2><p className="text-sm text-gray-500">Vista previa del día</p></div>{canAddNotes && <button type="button" onClick={() => setShowNoteForm((value) => !value)} className="rounded bg-green-700 px-3 py-2 text-sm text-white">+ Añadir</button>}</div>
          {showNoteForm && canAddNotes && <form className="mt-4 space-y-3 rounded border border-amber-200 bg-amber-50 p-3" onSubmit={(e) => { e.preventDefault(); createNoteMutation.mutate(); }}><h3 className="font-semibold">Nueva nota o evento</h3><input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" placeholder="Título" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} required maxLength={120} /><input className="w-full rounded border border-gray-300 px-2 py-2 text-sm" type="time" value={noteTime} onChange={(e) => setNoteTime(e.target.value)} /><textarea className="w-full rounded border border-gray-300 px-2 py-2 text-sm" placeholder="Detalles (opcional)" rows={3} value={noteDetails} onChange={(e) => setNoteDetails(e.target.value)} maxLength={1000} /><div className="flex gap-2"><button type="button" onClick={() => setShowNoteForm(false)} className="rounded border border-gray-300 px-3 py-2 text-sm">Cancelar</button><button type="submit" disabled={createNoteMutation.isPending} className="rounded bg-green-700 px-3 py-2 text-sm text-white disabled:opacity-50">Guardar</button></div>{createNoteMutation.isError && <p className="text-sm text-red-600">{createNoteMutation.error.message}</p>}</form>}
          {selectedEvents.length === 0 ? <div className="mt-6 rounded border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500"><p>No hay nada programado.</p>{canAddNotes && <p className="mt-1">Pulsa “Añadir” para crear una nota o evento.</p>}</div> : <ul className="mt-4 space-y-2">{selectedEvents.map((event) => <li key={event.key} className={`rounded border p-3 text-sm ${event.className}`}>{event.kind === "note" ? <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{event.time && `${event.time} · `}{event.label}</p>{(notes.data ?? []).find((note) => `note-${note.id}` === event.key)?.details && <p className="mt-1 whitespace-pre-wrap text-xs">{(notes.data ?? []).find((note) => `note-${note.id}` === event.key)?.details}</p>}</div>{canAddNotes && <button type="button" onClick={() => deleteNoteMutation.mutate(event.key.replace("note-", ""))} className="text-xs text-red-700 hover:underline">Eliminar</button>}</div> : <Link to={event.href} className="block"><p className="font-semibold">{event.time && `${event.time} · `}{event.label}</p><p className="mt-1 text-xs underline">Abrir detalle</p></Link>}</li>)}</ul>}
        </aside>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">{LEGEND.map((item) => <li key={item.label} className="flex items-center gap-1"><span aria-hidden="true" className={`h-3 w-3 rounded border ${item.className}`} />{item.label}</li>)}</ul>
    </main>
  );
}

export default CalendarPage;
