import { Link } from "react-router-dom";
import type { Match } from "../api/matches";
import type { Training } from "../api/trainings";
import { buildEvents, dayHeading } from "../lib/calendar";
import { weekDays } from "../lib/dashboard";
import { todayIso } from "../lib/trainings";

interface WeekCalendarProps {
  trainings: Training[];
  matches: Match[];
  division: string;
}

const SHORT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Los siete días de la semana actual (de lunes a domingo) con sus entrenos y
 * partidos. En pantallas anchas se ve en siete columnas, y en el móvil como
 * una lista de siete días, igual que el calendario mensual.
 */
function WeekCalendar({ trainings, matches, division }: WeekCalendarProps) {
  const today = todayIso();
  const days = weekDays(today);
  const events = buildEvents(trainings, matches, division);

  return (
    <section className="rounded border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Esta semana</h2>
        <Link to="/calendario" className="text-sm text-green-700 underline">
          Ver calendario
        </Link>
      </div>

      {/* Siete columnas: solo en pantallas anchas */}
      <div className="hidden grid-cols-7 gap-2 md:grid">
        {days.map((key, index) => (
          <div key={key} className="min-w-0">
            <p
              className={`mb-1 rounded text-center text-xs font-semibold ${
                key === today ? "bg-green-700 py-0.5 text-white" : "py-0.5 text-gray-600"
              }`}
            >
              {SHORT_DAYS[index]} {Number(key.slice(8))}
            </p>
            <div className="space-y-1">
              {(events.get(key) ?? []).map((event) => (
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
        ))}
      </div>

      {/* Lista de siete días: solo en el móvil */}
      <div className="space-y-3 md:hidden">
        {days.map((key) => {
          const dayEvents = events.get(key) ?? [];
          return (
            <div key={key}>
              <h3
                className={`text-sm font-semibold ${
                  key === today ? "text-green-700" : "text-gray-700"
                }`}
              >
                {dayHeading(key)}
                {key === today && " · hoy"}
              </h3>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-gray-400">Sin actividad</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {dayEvents.map((event) => (
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
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default WeekCalendar;
