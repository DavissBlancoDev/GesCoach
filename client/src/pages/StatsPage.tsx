import { useState } from "react";
import { Link } from "react-router-dom";
import type { SquadPlayer } from "../api/players";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { usePlayers } from "../hooks/usePlayers";
import { canSeeStats } from "../lib/players";
import { matchStatPoints, playerCardStats, seasonStats, type MatchStatPoint } from "../lib/stats";

const number = (value: number, digits = 1) =>
  value.toLocaleString("es-ES", { maximumFractionDigits: digits });

function StatCard({ label, value, detail, accent = "text-gray-900" }: {
  label: string;
  value: string | number;
  detail?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  );
}

function GoalAnalysisCard({ points }: { points: MatchStatPoint[] }) {
  if (points.length === 0) return <EmptyChart text="Aún no hay partidos finalizados." />;
  const [activeTab, setActiveTab] = useState<"difference" | "for" | "against">("difference");
  const visiblePoints = points.slice(-8);
  const values = visiblePoints.map((point) => activeTab === "difference"
    ? point.difference
    : activeTab === "for" ? (point.match.goalsFor ?? 0) : (point.match.goalsAgainst ?? 0));
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  const width = 760;
  const height = 300;
  const chartLeft = 46;
  const chartTop = 18;
  const chartHeight = 206;
  const chartWidth = width - chartLeft - 16;
  const groupWidth = chartWidth / visiblePoints.length;
  const barWidth = Math.min(22, groupWidth / 2.8);
  const isDifference = activeTab === "difference";
  const zeroY = isDifference ? chartTop + chartHeight / 2 : chartTop + chartHeight;
  const scale = isDifference ? (chartHeight / 2 - 10) / max : chartHeight / max;
  const y = (value: number) => isDifference ? zeroY - value * scale : zeroY - value * scale;
  const ticks = isDifference
    ? Array.from({ length: max * 2 + 1 }, (_, index) => index - max)
    : Array.from({ length: max + 1 }, (_, index) => index);
  const labels = { difference: "Diferencia de goles", for: "Goles a favor", against: "Goles encajados" };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{labels[activeTab]}</h2>
        <div className="flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Estadísticas de goles">
          {(["difference", "for", "against"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === tab ? "bg-white text-green-800 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              {tab === "difference" ? "Diferencia" : tab === "for" ? "A favor" : "Encajados"}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[680px] w-full" role="img" aria-label={labels[activeTab]}>
          {ticks.map((value) => {
            const tickY = y(value);
            return (
              <g key={value}>
                <line x1={chartLeft} y1={tickY} x2={width - 16} y2={tickY} stroke={value === 0 ? "#9ca3af" : "#e5e7eb"} strokeDasharray={value === 0 ? undefined : "2 2"} />
                <text x={chartLeft - 8} y={tickY + 4} textAnchor="end" fontSize="11" fill="#6b7280">{value}</text>
              </g>
            );
          })}
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartTop + chartHeight} stroke="#9ca3af" />
          {visiblePoints.map((point, index) => {
            const value = values[index];
            const groupX = chartLeft + index * groupWidth;
            const x = groupX + groupWidth / 2 - barWidth / 2;
            const barY = isDifference && value < 0 ? zeroY : y(value);
            const barHeight = Math.abs(value) * scale;
            const color = isDifference ? (value >= 0 ? "#16a34a" : "#ef4444") : activeTab === "for" ? "#16a34a" : "#dc2626";
            return (
              <g key={point.match.id}>
                <rect x={x} y={barY} width={barWidth} height={barHeight} rx="2" fill={color}>
                  <title>{point.match.opponent.name}: {value}</title>
                </rect>
                <text x={groupX + groupWidth / 2} y={chartTop + chartHeight + 18} textAnchor="middle" fontSize="10" fill="#4b5563">{point.match.opponent.name}</text>
              </g>
            );
          })}
          <text x="12" y={chartTop + chartHeight / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 12 ${chartTop + chartHeight / 2})`}>Goles</text>
        </svg>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">Últimos {visiblePoints.length} partidos · Rival en el eje X</p>
    </section>
  );
}

function CardsChart({ points }: { points: MatchStatPoint[] }) {
  if (points.length === 0) return <EmptyChart text="Aún no hay tarjetas registradas." />;
  const visiblePoints = points.slice(-8);
  const max = Math.max(5, ...visiblePoints.flatMap((point) => [
    point.yellowFor + point.redFor,
    point.yellowAgainst + point.redAgainst,
  ]));
  const width = 760;
  const height = 300;
  const chartLeft = 46;
  const chartTop = 18;
  const chartWidth = width - chartLeft - 16;
  const chartHeight = 206;
  const groupWidth = chartWidth / visiblePoints.length;
  const barWidth = Math.min(18, groupWidth / 4);
  const y = (value: number) => chartTop + chartHeight - (value / max) * chartHeight;
  const bar = (value: number, x: number, color: string, label: string) => (
    <rect x={x} y={y(value)} width={barWidth} height={Math.max(0, (value / max) * chartHeight)} rx="2" fill={color}>
      <title>{label}: {value}</title>
    </rect>
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[680px] w-full" role="img" aria-label="Tarjetas por partido">
          {Array.from({ length: max + 1 }, (_, value) => (
            <g key={value}>
              <line x1={chartLeft} y1={y(value)} x2={width - 16} y2={y(value)} stroke="#e5e7eb" />
              <text x={chartLeft - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{value}</text>
            </g>
          ))}
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartTop + chartHeight} stroke="#9ca3af" />
          <line x1={chartLeft} y1={chartTop + chartHeight} x2={width - 16} y2={chartTop + chartHeight} stroke="#9ca3af" />
          {visiblePoints.map((point, index) => {
            const groupX = chartLeft + index * groupWidth;
            const oursX = groupX + groupWidth / 2 - barWidth - 2;
            const rivalX = groupX + groupWidth / 2 + 2;
            const oursTotal = point.yellowFor + point.redFor;
            const rivalTotal = point.yellowAgainst + point.redAgainst;
            return (
              <g key={point.match.id}>
                {bar(oursTotal, oursX, "#fbbf24", `${point.match.opponent.name} · nuestro equipo`)}
                {bar(rivalTotal, rivalX, "#94a3b8", `${point.match.opponent.name} · rival`)}
                {point.redFor > 0 && <rect x={oursX} y={y(oursTotal)} width={barWidth} height={(point.redFor / max) * chartHeight} fill="#ef4444"><title>{point.match.opponent.name} · rojas de nuestro equipo: {point.redFor}</title></rect>}
                {point.redAgainst > 0 && <rect x={rivalX} y={y(rivalTotal)} width={barWidth} height={(point.redAgainst / max) * chartHeight} fill="#64748b"><title>{point.match.opponent.name} · rojas del rival: {point.redAgainst}</title></rect>}
                <text x={groupX + groupWidth / 2} y={chartTop + chartHeight + 18} textAnchor="middle" fontSize="10" fill="#4b5563">{point.match.opponent.name}</text>
              </g>
            );
          })}
          <text x="12" y={chartTop + chartHeight / 2} textAnchor="middle" fontSize="11" fill="#6b7280" transform={`rotate(-90 12 ${chartTop + chartHeight / 2})`}>Tarjetas</text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />Amarilla equipo</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Roja equipo</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300" />Amarilla rival</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500" />Roja rival</span>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">Últimos {visiblePoints.length} partidos · Eje Y ampliable por encima de 5 tarjetas</p>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) { return <p className="rounded border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">{text}</p>; }

function leader(players: SquadPlayer[], key: "goals" | "assists" | "yellowCards") {
  return players.filter((player) => player.stats).sort((a, b) => (b.stats?.[key] ?? 0) - (a.stats?.[key] ?? 0))[0];
}

function PlayerRankingsCard({ players }: { players: SquadPlayer[] }) {
  const [activeTab, setActiveTab] = useState<"goals" | "assists">("goals");
  const ranking = players
    .filter((player) => (player.stats?.[activeTab] ?? 0) > 0)
    .sort((a, b) => (b.stats?.[activeTab] ?? 0) - (a.stats?.[activeTab] ?? 0));
  const isGoalsTab = activeTab === "goals";

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Rendimiento ofensivo</h2>
        <div className="flex rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Estadísticas ofensivas">
          <button
            type="button"
            role="tab"
            aria-selected={isGoalsTab}
            onClick={() => setActiveTab("goals")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${isGoalsTab ? "bg-white text-green-800 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            Goleadores
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isGoalsTab}
            onClick={() => setActiveTab("assists")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${!isGoalsTab ? "bg-white text-green-800 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            Asistentes
          </button>
        </div>
      </div>
      {ranking.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay datos registrados.</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {ranking.map((player, index) => (
            <li key={player.id} className="flex items-center gap-3 py-2">
              <span className="w-5 text-center text-sm font-bold text-gray-400">{index + 1}</span>
              <Link to={`/plantilla/${player.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-green-700">
                {player.nickname || `${player.name} ${player.surname}`}
              </Link>
              <span className="font-bold tabular-nums">{player.stats?.[activeTab] ?? 0} <span className="text-xs font-normal text-gray-500">{isGoalsTab ? "goles" : "asistencias"}</span></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function StatsPage() {
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const matches = useMatches(teamId);
  const players = usePlayers(teamId);

  if (!current?.team || !current.currentSeason) return <p className="p-6">Cargando...</p>;
  if (!canSeeStats(current.role)) return <main className="mx-auto max-w-5xl p-4"><h1 className="text-2xl font-bold">Estadísticas</h1><p className="mt-4 rounded border border-dashed border-gray-300 p-6 text-gray-600">Tu rol no tiene permiso para consultar las estadísticas.</p></main>;
  if (matches.isPending || players.isPending) return <p className="p-6">Cargando estadísticas...</p>;
  if (matches.isError || players.isError) return <p className="p-6 text-red-600">No se han podido cargar las estadísticas.</p>;

  const playerList = players.data ?? [];
  const playerIds = new Set(playerList.map((player) => player.id));
  const summary = seasonStats(matches.data ?? []);
  const points = matchStatPoints(matches.data ?? [], playerIds);
  const topScorer = leader(playerList, "goals");
  const topAssistant = leader(playerList, "assists");
  const cardsByPlayer = playerCardStats(matches.data ?? []);
  const playersWithCards = playerList
    .map((player) => ({ player, cards: cardsByPlayer.get(player.id) ?? { yellowCards: 0, redCards: 0 } }))
    .filter(({ cards }) => cards.yellowCards > 0 || cards.redCards > 0)
    .sort((a, b) => (b.cards.yellowCards + b.cards.redCards) - (a.cards.yellowCards + a.cards.redCards));
  const mostBooked = playersWithCards[0]?.player;

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="mb-6"><h1 className="text-2xl font-bold">Estadísticas</h1><p className="text-sm text-gray-600">Resumen de la temporada · {summary.played} partidos finalizados</p></div>
      {summary.played === 0 ? <EmptyChart text="Cuando finalices el primer partido, aquí aparecerá el análisis de la temporada." /> : <>
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatCard label="Partidos" value={summary.played} detail={`${summary.wins} V · ${summary.draws} E · ${summary.losses} D`} />
          <StatCard label="Goles a favor" value={summary.goalsFor} detail={`${number(summary.goalsFor / summary.played)} por partido`} accent="text-green-700" />
          <StatCard label="Goles encajados" value={summary.goalsAgainst} detail={`${number(summary.goalsAgainst / summary.played)} por partido`} accent="text-red-700" />
          <StatCard label="Diferencia" value={summary.goalsFor - summary.goalsAgainst} detail="Goles a favor − encajados" accent={summary.goalsFor >= summary.goalsAgainst ? "text-green-700" : "text-red-700"} />
          <StatCard label="Porterías a cero" value={summary.cleanSheets} detail={`${number((summary.cleanSheets / summary.played) * 100, 0)}% de los partidos`} />
          <StatCard label="Puntos de liga" value={summary.points} detail={`${summary.leaguePlayed > 0 ? number(summary.points / summary.leaguePlayed) : "0"} por partido de liga`} accent="text-violet-700" />
          <StatCard label="Victorias" value={`${number((summary.wins / summary.played) * 100, 0)}%`} detail={`${summary.wins} de ${summary.played}`} accent="text-green-700" />
          <StatCard label="Disciplina" value={[...cardsByPlayer.values()].reduce((sum, cards) => sum + cards.yellowCards + cards.redCards, 0)} detail="Tarjetas de jugadores" accent="text-amber-700" />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="mb-3 text-lg font-semibold">Líderes de la plantilla</h2><div className="grid gap-3 sm:grid-cols-3">{[
            { label: "Máximo goleador", player: topScorer, key: "goals" as const, suffix: "goles" },
            { label: "Más asistencias", player: topAssistant, key: "assists" as const, suffix: "asistencias" },
            { label: "Más tarjetas", player: mostBooked, key: "yellowCards" as const, suffix: "amarillas" },
          ].map(({ label, player, key, suffix }) => <div key={label} className="rounded bg-gray-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>{player ? <><Link to={`/plantilla/${player.id}`} className="mt-2 block truncate font-semibold hover:text-green-700">{player.nickname || `${player.name} ${player.surname}`}</Link><p className="mt-1 text-xl font-bold">{label === "Más tarjetas" ? (cardsByPlayer.get(player.id)?.yellowCards ?? 0) : (player.stats?.[key] ?? 0)} <span className="text-xs font-normal text-gray-500">{suffix}</span></p></> : <p className="mt-2 text-sm text-gray-500">Sin datos</p>}</div>)}</div></section>
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="mb-3 text-lg font-semibold">Tarjetas por jugador</h2>{playersWithCards.length === 0 ? <p className="text-sm text-gray-500">No hay tarjetas registradas en las actas.</p> : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{playersWithCards.map(({ player, cards }) => <li key={player.id} className="flex items-center gap-3 rounded bg-amber-50 px-3 py-2"><Link to={`/plantilla/${player.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-green-800">{player.nickname || `${player.name} ${player.surname}`}</Link><span className="whitespace-nowrap text-sm font-semibold"><span title="Amarillas">🟨 {cards.yellowCards}</span> <span title="Rojas">🟥 {cards.redCards}</span></span></li>)}</ul>}</section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <GoalAnalysisCard points={points} />
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Tarjetas por partido</h2><CardsChart points={points} /></section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <PlayerRankingsCard players={playerList} />
        </div>

      </>}
    </main>
  );
}

export default StatsPage;
