import { Link } from "react-router-dom";
import { useSession } from "../hooks/useSession";

const features = [
  {
    icon: "▦",
    title: "Todo tu equipo, en un lugar",
    text: "Plantilla, cuerpo técnico y datos importantes siempre a mano.",
  },
  {
    icon: "◷",
    title: "Entrenos que fluyen",
    text: "Planifica sesiones, controla la asistencia y llega preparado al campo.",
  },
  {
    icon: "↗",
    title: "Decide con perspectiva",
    text: "Analiza partidos y la evolución de tus jugadores durante toda la temporada.",
  },
];

function LandingPage() {
  const { data: user } = useSession();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f4] text-[#16231d]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#173b2b] text-sm text-[#d7f264]">G</span>
          GesCoach
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium">
          {user ? (
            <Link to="/inicio" className="rounded-full bg-[#173b2b] px-5 py-2.5 text-white transition hover:bg-[#285a43]">
              Ir a mi espacio
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden px-3 py-2 text-[#53625a] transition hover:text-[#173b2b] sm:block">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="rounded-full bg-[#173b2b] px-5 py-2.5 text-white transition hover:bg-[#285a43]">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[1fr_0.9fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d8e1d5] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#52725b]">
            <span className="h-2 w-2 rounded-full bg-[#c5e94f]" />
            Gestión deportiva sin complicaciones
          </p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-tighter sm:text-6xl lg:text-7xl">
            Entrena mejor. <span className="text-[#6c9b48]">Crece juntos.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#64726a]">
            La herramienta sencilla para organizar tu club, cuidar de tu equipo y disfrutar más de cada temporada.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/registro" className="rounded-full bg-[#b9dc45] px-7 py-3.5 text-sm font-bold text-[#173b2b] shadow-[0_8px_25px_rgba(116,150,57,0.18)] transition hover:bg-[#c9eb58]">
              Empieza gratis <span className="ml-2">→</span>
            </Link>
            <Link to="/login" className="text-sm font-semibold text-[#53625a] underline decoration-[#b9dc45] decoration-2 underline-offset-4 hover:text-[#173b2b]">
              Ya tengo una cuenta
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#718078]">
            <div className="flex -space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f7f8f4] bg-[#d8a982] text-xs">M</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f7f8f4] bg-[#8db5a1] text-xs">A</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f7f8f4] bg-[#c7b3d7] text-xs">L</span>
            </div>
            <span>Hecho para quienes viven el fútbol</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-132.5 lg:mt-4">
          <div className="absolute -right-5 -top-8 h-44 w-44 rounded-full bg-[#dff18d] blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#cfe4d6] blur-3xl" />
          <div className="relative rounded-[28px] border border-white/80 bg-[#173b2b] p-3 shadow-[0_30px_70px_rgba(35,69,48,0.22)] sm:p-4">
            <div className="rounded-[20px] bg-[#f8faf6] p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-[#e6ece5] pb-5">
                <div>
                  <p className="text-xs font-medium text-[#819087]">MI EQUIPO · TEMPORADA 24/25</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight">Club Deportivo Norte</h2>
                </div>
                <span className="rounded-full bg-[#e4f5a9] px-3 py-1.5 text-xs font-bold text-[#4b702d]">Activo</span>
              </div>
              <div className="grid grid-cols-3 gap-3 py-6">
                {[['18', 'Jugadores'], ['04', 'Entrenos'], ['12', 'Partidos']].map(([number, label]) => (
                  <div key={label} className="rounded-2xl bg-[#f0f4ed] p-3">
                    <p className="text-2xl font-bold tracking-tight text-[#173b2b]">{number}</p>
                    <p className="mt-1 text-[11px] text-[#819087]">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#173b2b] p-4 text-white">
                <div><p className="text-xs text-[#a9c0b1]">PRÓXIMO PARTIDO</p><p className="mt-1 font-semibold">CD Norte <span className="mx-1 text-[#b9dc45]">vs</span> Atlético Sur</p></div>
                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold">Sáb, 18:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e1e8df] bg-white/55">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-3 lg:px-10">
          {features.map((feature) => (
            <article key={feature.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5bd] text-xl font-bold text-[#557d38]">{feature.icon}</span>
              <div><h3 className="font-bold">{feature.title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#718078]">{feature.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-14 sm:flex-row sm:items-center lg:px-10">
        <div><p className="text-2xl font-semibold tracking-tight">Tu próxima temporada empieza aquí.</p><p className="mt-1 text-sm text-[#718078]">Organiza el trabajo. Potencia al equipo.</p></div>
        <Link to="/registro" className="rounded-full border border-[#173b2b] px-6 py-3 text-sm font-bold text-[#173b2b] transition hover:bg-[#173b2b] hover:text-white">Crear mi equipo <span className="ml-2">→</span></Link>
      </section>
    </main>
  );
}

export default LandingPage;
