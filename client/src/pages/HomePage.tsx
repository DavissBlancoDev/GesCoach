import { Navigate, useNavigate } from "react-router-dom";
import { useMyTeams } from "../hooks/useMyTeams";
import { useSession } from "../hooks/useSession";
import { useLogout } from "../hooks/useLogout";
import { setSelectedTeamId } from "../lib/selectedTeam";
import { CATEGORY_LABELS, MODALITY_LABELS, ROLE_LABELS, seasonLabel } from "../lib/teams";

function HomePage() {
  const { data: user } = useSession();
  const { data: teams, isPending, isError } = useMyTeams();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  if (isPending) return <main className="flex min-h-screen items-center justify-center bg-[#f5f7f2] text-sm text-[#64726a]">Cargando tus equipos...</main>;
  if (isError || !teams) return <main className="flex min-h-screen items-center justify-center bg-[#f5f7f2] p-6 text-center text-sm text-red-700">No se pueden cargar tus equipos.</main>;
  if (teams.length === 0) return <Navigate to="/crear-equipo" replace />;

  function openTeam(teamId: string) {
    setSelectedTeamId(teamId);
    navigate("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#16231d]">
      <header className="border-b border-[#e1e8df] bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173b2b] text-base font-bold text-[#d7f264]">G</span>
            <span className="text-lg font-bold tracking-tight">GesCoach</span>
          </div>
          <button type="button" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending} className="rounded-full px-3 py-2 text-sm font-semibold text-[#64726a] transition hover:bg-[#edf3e9] hover:text-[#173b2b]">
            {logoutMutation.isPending ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="border-b border-[#dfe7dc] pb-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#6c9b48]">Tu espacio de trabajo</p>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {user?.name}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#64726a] sm:text-base">Selecciona el equipo con el que quieres trabajar y continúa organizando tu temporada.</p></div>
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#53625a] shadow-sm ring-1 ring-[#e1e8df]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5bd] font-bold text-[#557d38]">{teams.length}</span><span>{teams.length === 1 ? "equipo disponible" : "equipos disponibles"}</span></div>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#819087]">Tus equipos</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Elige un equipo</h2></div><span className="hidden text-sm text-[#819087] sm:block">Haz clic para entrar</span></div>
          <ul className="grid gap-4 md:grid-cols-2">
            {teams.map(({ team, currentSeason, role }) => team ? (
              <li key={team._id}>
                <button type="button" onClick={() => openTeam(team._id)} className="group relative w-full overflow-hidden rounded-2xl border border-[#dfe7dc] bg-white p-5 text-left shadow-[0_6px_18px_rgba(48,76,56,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#b9dc45] hover:shadow-[0_12px_28px_rgba(48,76,56,0.12)]">
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: `linear-gradient(to bottom, ${team.primaryColor} 0 50%, ${team.secondaryColor} 50% 100%)` }} />
                  <span className="flex items-start justify-between gap-4 pl-2">
                    <span className="flex min-w-0 items-center gap-3">
                      {team.badgeUrl ? <img src={team.badgeUrl} alt="" className="h-11 w-11 rounded-xl border border-[#edf1eb] object-contain p-1" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: team.primaryColor }}>{team.name.charAt(0).toUpperCase()}</span>}
                      <span className="min-w-0"><span className="block truncate text-lg font-bold tracking-tight">{team.name}</span><span className="mt-1 block text-sm text-[#718078]">{ROLE_LABELS[role]}</span></span>
                    </span>
                    <span className="flex items-center gap-2"><span className="flex h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-white shadow-sm ring-1 ring-[#dfe7dc]" title="Colores del equipo"><i className="h-full flex-1" style={{ backgroundColor: team.primaryColor }} /><i className="h-full flex-1" style={{ backgroundColor: team.secondaryColor }} /></span><span className="mt-1 text-xl text-[#9aaa9e] transition group-hover:translate-x-1 group-hover:text-[#557d38]">→</span></span>
                  </span>
                  {currentSeason && <span className="mt-5 block border-t border-[#edf1eb] pt-4 pl-2"><span className="flex flex-wrap gap-2 text-xs font-semibold text-[#53625a]"><span className="rounded-full bg-[#f0f4ed] px-2.5 py-1">{CATEGORY_LABELS[currentSeason.category]}</span><span className="rounded-full bg-[#f0f4ed] px-2.5 py-1">{MODALITY_LABELS[currentSeason.modality]}</span><span className="rounded-full bg-[#f0f4ed] px-2.5 py-1">{seasonLabel(currentSeason.startYear)}</span></span><span className="mt-3 flex items-center justify-between gap-3 text-sm text-[#718078]"><span className="truncate">{currentSeason.division}</span><span className="text-xs font-semibold text-[#819087]">Primario / secundario</span></span></span>}
                </button>
              </li>
            ) : null)}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default HomePage;
