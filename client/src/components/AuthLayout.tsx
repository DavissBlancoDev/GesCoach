import type { ReactNode } from "react";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7f4] p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_80px_rgba(10,45,27,0.14)] lg:min-h-170 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-[#07130e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative">
            <div className="mb-10 flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="GesCoach"
                className="h-12 w-12 rounded-2xl bg-black p-1.5 object-contain shadow-lg"
              />
              <span className="text-xl font-semibold tracking-tight">
                GesCoach
              </span>
            </div>
            <p className="max-w-xs text-sm font-medium uppercase tracking-[0.2em] text-green-300">
              Gestión deportiva inteligente
            </p>
            <h2 className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-tight">
              Todo tu equipo. En un solo lugar.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
              Organiza entrenamientos, partidos, plantilla y estadísticas para
              que cada decisión cuente.
            </p>
          </div>
          <div className="relative flex items-center gap-3 text-sm text-white/55">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Tu banquillo y pizarra en tu pantalla
          </div>
        </aside>
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="GesCoach"
                className="h-11 w-11 rounded-2xl bg-black p-1.5 object-contain shadow-sm"
              />
              <span className="text-xl font-semibold tracking-tight text-slate-900">
                GesCoach
              </span>
            </div>
          </div>
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {description}
            </p>
            <div className="mt-8">{children}</div>
            <div className="mt-7 border-t border-slate-100 pt-5">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
