import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { useTrainings } from "../hooks/useTrainings";
import {
  WEEKDAYS,
  buildEvents,
  dayHeading,
  monthCells,
  monthTitle,
} from "../lib/calendar";
import { todayIso } from "../lib/trainings";
import { RESULT_STYLES } from "../lib/matches";

// Elementos de la leyenda: el texto explica el color
const LEGEND = [
  { label: "Entreno", className: "border-blue-300 bg-blue-100" },
  { label: "Partido", className: "border-purple-300 bg-purple-100" },
  { label: "Victoria", className: RESULT_STYLES.win.box },
  { label: "Empate", className: RESULT_STYLES.draw.box },
  { label: "Derrota", className: RESULT_STYLES.loss.box },
  { label: "Suspendido", className: "border-gray-300 bg-gray-100" },
];

/**
 * Calendario de la temporada, mes a mes, con los entrenos y los partidos.
 * En pantallas anchas se ve como una cuadrícula de semanas (lunes a
 * domingo), y en el móvil como una lista agrupada por días, porque siete
 * columnas no se leen bien en una pantalla estrecha.
 */
function CalendarPage() {
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const trainings = useTrainings(teamId);
  const matches = useMatches(teamId);

  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  // RequireTeam garantiza que hay equipo; esto cubre el instante de carga
  if (!current || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  const events = buildEvents(
    trainings.data ?? [],
    matches.data ?? [],
    current.currentSeason.division
  );
  const cells = monthCells(view.year, view.month);
  const today = todayIso();

  // Días del mes que tienen algo, para la lista del móvil
  const daysWithEvents = cells.filter((c) => c.key && events.has(c.key));

  /** Cambia de mes: -1 es el anterior y 1 el siguiente. */
  function goToMonth(delta: number) {
    setView((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  const loading = trainings.isPending || matches.isPending;
  const failed = trainings.isError || matches.isError;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-3 text-2xl font-bold">Calendario</h1>

      {/* Navegación entre meses */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => goToMonth(-1)}
          className="h-10 w-10 rounded border border-gray-300 text-xl"
        >
          ‹
        </button>
        <h2 className="flex-1 text-center text-lg font-semibold">
          {monthTitle(view.year, view.month)}
        </h2>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => goToMonth(1)}
          className="h-10 w-10 rounded border border-gray-300 text-xl"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setView({ year: now.getFullYear(), month: now.getMonth() })}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          Hoy
        </button>
      </div>

      {loading && <p className="mb-2 text-sm text-gray-600">Cargando...</p>}
      {failed && (
        <p className="mb-2 text-sm text-red-600">No se han podido cargar todos los datos.</p>
      )}

      {/* Cuadrícula del mes: solo en pantallas anchas */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-l border-t border-gray-200">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-b border-r border-gray-200 bg-gray-50 py-1 text-center text-xs font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}
          {cells.map((cell, index) => {
            const dayEvents = cell.key ? (events.get(cell.key) ?? []) : [];
            const isToday = cell.key === today;
            return (
              <div
                key={index}
                className={`min-h-28 border-b border-r border-gray-200 p-1 ${
                  cell.day === null ? "bg-gray-50" : ""
                }`}
              >
                {cell.day !== null && (
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday ? "bg-green-700 font-bold text-white" : "text-gray-600"
                    }`}
                  >
                    {cell.day}
                  </span>
                )}
                <div className="mt-1 space-y-1">
                  {dayEvents.map((event) => (
                    <Link
                      key={event.key}
                      to={event.href}
                      title={event.title}
                      className={`block truncate rounded border px-1 py-0.5 text-xs ${event.className}`}
                    >
                      {event.time && <span className="font-semibold">{event.time} </span>}
                      {event.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista agrupada por días: solo en el móvil */}
      <div className="md:hidden">
        {daysWithEvents.length === 0 ? (
          <p className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
            No hay entrenos ni partidos este mes.
          </p>
        ) : (
          <div className="space-y-4">
            {daysWithEvents.map((cell) => {
              const key = cell.key as string;
              return (
                <section key={key}>
                  <h3
                    className={`text-sm font-semibold ${
                      key === today ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {dayHeading(key)}
                    {key === today && " · hoy"}
                  </h3>
                  <ul className="mt-1 space-y-1">
                    {(events.get(key) ?? []).map((event) => (
                      <li key={event.key}>
                        <Link
                          to={event.href}
                          title={event.title}
                          className={`flex items-center gap-2 rounded border p-2 ${event.className}`}
                        >
                          <span className="w-20 shrink-0 text-xs font-semibold">
                            {event.time ?? (event.kind === "match" ? "Por confirmar" : "")}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{event.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Leyenda: no depende solo del color, cada color lleva su nombre */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <span aria-hidden="true" className={`h-3 w-3 rounded border ${item.className}`} />
            {item.label}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default CalendarPage;
