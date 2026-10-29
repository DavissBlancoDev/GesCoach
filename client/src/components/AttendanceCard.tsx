import type { PlayerAttendance } from "../api/players";

// Porcentaje redondeado. Al redondear, los tres pueden sumar 99 o 101.
const percent = (count: number, total: number) => Math.round((count / total) * 100);

/**
 * Tarjeta de asistencia a entrenos de un jugador: porcentaje de asistencia,
 * de ausencias justificadas y de ausencias injustificadas, siempre con los
 * números absolutos, porque un porcentaje sobre dos entrenos no significa lo
 * mismo que sobre veinte.
 */
function AttendanceCard({ attendance }: { attendance: PlayerAttendance }) {
  const { total } = attendance;

  const rows = [
    { label: "Asistencia", count: attendance.present, color: "bg-green-600" },
    { label: "Ausencias justificadas", count: attendance.justifiedAbsence, color: "bg-orange-500" },
    { label: "Ausencias injustificadas", count: attendance.unjustifiedAbsence, color: "bg-red-600" },
  ];

  return (
    <section className="rounded border border-gray-200 p-4">
      <h2 className="mb-3 text-lg font-semibold">Asistencia a entrenos</h2>

      {total === 0 ? (
        <p className="text-sm text-gray-600">Sin entrenos registrados.</p>
      ) : (
        <>
          {/* Barra decorativa: los datos están en el texto de debajo */}
          <div aria-hidden="true" className="flex h-3 overflow-hidden rounded bg-gray-100">
            {rows.map((row) => (
              <div
                key={row.label}
                className={row.color}
                style={{ width: `${(row.count / total) * 100}%` }}
              />
            ))}
          </div>

          <ul className="mt-3 space-y-1 text-sm">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-2">
                <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${row.color}`} />
                <span className="flex-1">{row.label}</span>
                <span className="tabular-nums">
                  <strong>{percent(row.count, total)} %</strong>
                  <span className="text-gray-500">
                    {" "}
                    ({row.count} de {total})
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-gray-500">
            Calculado sobre los {total} entrenos en los que consta su asistencia, sin contar los
            suspendidos.
          </p>
        </>
      )}
    </section>
  );
}

export default AttendanceCard;
