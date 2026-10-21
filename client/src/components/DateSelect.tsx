import { useState } from "react";

interface DateSelectProps {
  id: string;
  label: string;
  // Fecha en formato AAAA-MM-DD, o "" si todavía no hay
  value: string;
  // Recibe la fecha completa (AAAA-MM-DD) o "" si falta alguna de las tres partes
  onChange: (value: string) => void;
  minYear: number;
  maxYear: number;
  // "desc": del año más reciente al más antiguo (fechas de nacimiento);
  // "asc": del más antiguo al más reciente (fechas de contrato)
  order?: "asc" | "desc";
  required?: boolean;
  error?: string;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Partes de una fecha, como texto: vacías mientras no se elijan
interface Parts {
  year: string;
  month: string;
  day: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Separa "AAAA-MM-DD" en año, mes y día (el mes y el día sin ceros a la izquierda). */
function splitDate(value: string): Parts {
  const [year = "", month = "", day = ""] = value.split("-");
  return {
    year,
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : "",
  };
}

/** Días que tiene un mes. Sin año se usa uno bisiesto, para permitir el 29 de febrero. */
const daysInMonth = (year: string, month: string) =>
  month ? new Date(year ? Number(year) : 2000, Number(month), 0).getDate() : 31;

/**
 * Selector de fecha con tres desplegables (día, mes y año). Es más cómodo
 * que el calendario del navegador para elegir años lejanos, como en una
 * fecha de nacimiento, y funciona bien en el móvil. La fecha solo se
 * comunica al formulario cuando están elegidas las tres partes.
 */
function DateSelect({
  id,
  label,
  value,
  onChange,
  minYear,
  maxYear,
  order = "desc",
  required,
  error,
}: DateSelectProps) {
  // Las tres partes se guardan por separado porque se eligen una a una
  const [parts, setParts] = useState<Parts>(() => splitDate(value));

  /** Actualiza las partes y avisa al formulario de la fecha resultante. */
  function update(next: Parts) {
    // Si el día no existe en el mes elegido (31 de febrero), lo ajustamos
    const limit = daysInMonth(next.year, next.month);
    const fixed = next.day && Number(next.day) > limit ? { ...next, day: String(limit) } : next;

    setParts(fixed);
    onChange(
      fixed.year && fixed.month && fixed.day
        ? `${fixed.year}-${pad(Number(fixed.month))}-${pad(Number(fixed.day))}`
        : ""
    );
  }

  const days = Array.from({ length: daysInMonth(parts.year, parts.month) }, (_, i) => i + 1);

  // Si la fecha que se está editando cae fuera del rango, se añade su año
  // para que no aparezca el desplegable en blanco
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  if (parts.year && !years.includes(Number(parts.year))) years.push(Number(parts.year));
  years.sort((a, b) => (order === "desc" ? b - a : a - b));

  const selectClass = "rounded border border-gray-300 bg-white px-2 py-2";

  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="block text-sm font-medium text-gray-700">
        {label}
      </span>
      <div className="mt-1 flex gap-2">
        <select
          id={id}
          aria-label={`${label}: día`}
          value={parts.day}
          onChange={(e) => update({ ...parts, day: e.target.value })}
          required={required}
          className={`${selectClass} w-20`}
        >
          <option value="">Día</option>
          {days.map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: mes`}
          value={parts.month}
          onChange={(e) => update({ ...parts, month: e.target.value })}
          required={required}
          className={`${selectClass} min-w-0 flex-1`}
        >
          <option value="">Mes</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: año`}
          value={parts.year}
          onChange={(e) => update({ ...parts, year: e.target.value })}
          required={required}
          className={`${selectClass} w-24`}
        >
          <option value="">Año</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default DateSelect;
