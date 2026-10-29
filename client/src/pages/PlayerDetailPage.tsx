import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deletePlayer,
  updatePlayerStatus,
  type PlayerStatus,
  type SquadPlayer,
} from "../api/players";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { usePlayers } from "../hooks/usePlayers";
import { countryName } from "../lib/countries";
import { POSITION_LABELS } from "../lib/positions";
import { STAT_COLUMNS, isGoalkeeper } from "../lib/stats";
import {
  PLAYER_STATUS_COLORS,
  PLAYER_STATUS_LABELS,
  PLAYER_STATUS_LIST,
  canEditContract,
  canEditSquad,
  canManageNotes,
  canSeeStats,
  canSetStatus,
  licenseLabel,
} from "../lib/players";
import AttendanceCard from "../components/AttendanceCard";
import Flag from "../components/Flag";
import PlayerForm from "../components/PlayerForm";
import PlayerNotes from "../components/PlayerNotes";
import PositionBadge from "../components/PositionBadge";
import StatusIcon from "../components/StatusIcon";

/**
 * Fecha en texto largo ("20 de marzo de 2012"). Se usa UTC porque las
 * fechas se guardan a medianoche UTC, y en otra zona horaria saldría un
 * día menos.
 */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

/** Una fila de la tarjeta de información: etiqueta y valor. */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * Ficha de un jugador: cabecera con dorsal y nombre futbolístico, cambio
 * rápido de estado, tarjeta de información, estadísticas e historial de
 * partidos. Los datos se sacan de la plantilla ya cargada, así que no hace
 * falta otra petición. Con "Editar" se abre el formulario en el mismo sitio.
 */
function PlayerDetailPage() {
  const { playerId } = useParams();
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const { data: players, isPending, isError } = usePlayers(teamId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deletePlayer(teamId as string, playerId as string),
    onSuccess: () => {
      // Quitamos al jugador de la caché antes de volver a la plantilla, para
      // que no se vea un instante con el jugador ya eliminado
      queryClient.setQueryData<SquadPlayer[]>(["players", teamId], (old) =>
        old?.filter((p) => p.id !== playerId)
      );
      navigate("/plantilla", { replace: true });
      // Y refrescamos en segundo plano para confirmar con el servidor
      void queryClient.invalidateQueries({ queryKey: ["players", teamId] });
    },
  });

  // Cambio rápido de estado: actualiza solo ese dato en la caché
  const statusMutation = useMutation({
    mutationFn: (status: PlayerStatus) =>
      updatePlayerStatus(teamId as string, playerId as string, status),
    onSuccess: ({ status }) => {
      queryClient.setQueryData<SquadPlayer[]>(["players", teamId], (old) =>
        old?.map((p) => (p.id === playerId ? { ...p, status } : p))
      );
    },
  });

  if (!current || isPending) return <p className="p-6">Cargando...</p>;
  if (isError) return <p className="p-6 text-red-600">No se ha podido cargar el jugador.</p>;

  const player = players?.find((p) => p.id === playerId);
  if (!player) {
    return (
      <main className="mx-auto max-w-5xl p-4">
        <p>Jugador no encontrado.</p>
        <Link to="/plantilla" className="text-green-700 underline">
          Volver a la plantilla
        </Link>
      </main>
    );
  }

  const role = current.role;
  const canEdit = canEditSquad(role);
  const displayName = player.nickname || player.name;
  const goalkeeper = isGoalkeeper(player);
  const salary = player.contract?.salary;

  // Estados a los que este rol puede cambiar al jugador desde su estado actual
  const allowedStatuses = PLAYER_STATUS_LIST.filter(
    (status) => status !== player.status && canSetStatus(role, player.status, status)
  );

  return (
    <main className="mx-auto max-w-5xl p-4">
      <Link to="/plantilla" className="text-sm text-gray-600 hover:underline">
        ← Plantilla
      </Link>

      {/* Cabecera: dorsal y nombre futbolístico destacados */}
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">
            {typeof player.jerseyNumber === "number" && (
              <>
                {player.jerseyNumber} <span className="text-gray-400">-</span>{" "}
              </>
            )}
            {displayName}
          </h1>
          <p className="mt-2 text-lg">
            {player.name} {player.surname}
            <span className="text-gray-600"> - {player.age} años</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-medium ${PLAYER_STATUS_COLORS[player.status]}`}
            >
              {PLAYER_STATUS_LABELS[player.status]}
            </span>
            {player.nationality && (
              <>
                <Flag code={player.nationality} />
                <span className="text-sm text-gray-600">{countryName(player.nationality)}</span>
              </>
            )}
          </div>

          {/* Cambio rápido de estado, sin abrir el formulario completo */}
          {allowedStatuses.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Cambiar estado:</span>
              {allowedStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(status)}
                  className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                >
                  <StatusIcon status={status} />
                  {PLAYER_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
          {statusMutation.isError && (
            <p className="mt-1 text-xs text-red-600">{statusMutation.error.message}</p>
          )}
        </div>

        {canEdit && !editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-gray-300 px-4 py-2 text-sm"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Eliminar
            </button>
          </div>
        )}
      </header>

      {/* Confirmación antes de eliminar: la acción no se puede deshacer */}
      {confirmingDelete && !editing && (
        <div role="alertdialog" className="mt-4 rounded border border-red-200 bg-red-50 p-4">
          <p className="font-medium">¿Eliminar a {displayName} de la plantilla?</p>
          <p className="mt-1 text-sm text-gray-700">
            Se quitará de la plantilla de esta temporada. Si no ha estado en ninguna otra
            temporada, también se borrarán sus datos personales. No se puede deshacer.
          </p>
          {deleteMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{deleteMutation.error.message}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="rounded bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      )}

      {/* Modo edición: el formulario sustituye al contenido de la ficha */}
      {editing ? (
        <div className="mt-6 max-w-2xl">
          <PlayerForm
            teamId={current.team!._id}
            role={role}
            defaultCategory={player.licenseCategory}
            player={player}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Columna izquierda: información adicional */}
          <section className="rounded border border-gray-200 p-4">
            <h2 className="mb-3 text-lg font-semibold">Información</h2>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Fecha de nacimiento">{formatDate(player.birthDate)}</InfoRow>
              <InfoRow label="Ficha">
                {licenseLabel(player.licenseCategory, player.licenseLetter)}
              </InfoRow>
              <InfoRow label="Posición principal">
                <span className="flex items-center gap-2">
                  <PositionBadge position={player.mainPosition} />
                  {POSITION_LABELS[player.mainPosition]}
                </span>
              </InfoRow>
              <InfoRow label="Posiciones secundarias">
                {player.secondaryPositions.length === 0 ? (
                  "Ninguna"
                ) : (
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    {player.secondaryPositions.map((p) => (
                      <span key={p} className="flex items-center gap-1">
                        <PositionBadge position={p} />
                        {POSITION_LABELS[p]}
                      </span>
                    ))}
                  </span>
                )}
              </InfoRow>

              {/* Tutores: solo llegan del servidor a los roles que pueden verlos */}
              {player.guardians && (
                <InfoRow label="Tutores">
                  {player.guardians.length === 0 ? (
                    "Sin tutores registrados"
                  ) : (
                    <ul className="space-y-1">
                      {player.guardians.map((g, i) => (
                        <li key={i}>
                          <span className="font-medium">{g.name}</span> ({g.relationship})
                          {g.phone && (
                            <>
                              {" · "}
                              <a href={`tel:${g.phone}`} className="text-green-700 underline">
                                {g.phone}
                              </a>
                            </>
                          )}
                          {g.email && (
                            <>
                              {" · "}
                              <a href={`mailto:${g.email}`} className="text-green-700 underline">
                                {g.email}
                              </a>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </InfoRow>
              )}

              {/* Contrato y sueldo: solo los ve el entrenador principal */}
              {canEditContract(role) && (
                <InfoRow label="Contrato">
                  {player.contract ? (
                    <>
                      Hasta el {formatDate(player.contract.endDate)} (
                      {player.contract.yearsLeft > 0
                        ? `${player.contract.yearsLeft.toLocaleString("es-ES")} años restantes`
                        : "finalizado"}
                      )
                    </>
                  ) : (
                    "Sin contrato registrado"
                  )}
                </InfoRow>
              )}
              {typeof salary === "number" && (
                <InfoRow label="Sueldo">
                  {formatMoney(salary)}{" "}
                  {player.contract?.salaryPeriod === "yearly" ? "/ año" : "/ mes"}
                </InfoRow>
              )}
            </dl>
          </section>

          {/* Columna derecha: estadísticas e historial */}
          <div className="space-y-4">
            {canSeeStats(role) && (
              <section className="rounded border border-gray-200 p-4">
                <h2 className="mb-3 text-lg font-semibold">Estadísticas</h2>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                  {STAT_COLUMNS.filter((col) => !col.goalkeeperOnly || goalkeeper).map((col) => (
                    <div key={col.key} className="rounded bg-gray-50 p-2">
                      <p className="text-xl font-bold tabular-nums">
                        {player.stats?.[col.key] ?? "–"}
                      </p>
                      <p className="text-xs text-gray-600">{col.title}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {canSeeStats(role) && player.attendance && (
              <AttendanceCard attendance={player.attendance} />
            )}

            <section className="rounded border border-gray-200 p-4">
              <h2 className="mb-3 text-lg font-semibold">Historial de partidos</h2>
              <p className="text-sm text-gray-600">
                Aún no hay partidos. Aquí aparecerán la convocatoria, los minutos y los goles de
                cada partido.
              </p>
            </section>
          </div>
        </div>
      )}

      {/* Notas del entrenador: solo las ve el entrenador principal */}
      {!editing && canManageNotes(role) && (
        <PlayerNotes teamId={current.team!._id} playerId={player.id} />
      )}
    </main>
  );
}

export default PlayerDetailPage;
