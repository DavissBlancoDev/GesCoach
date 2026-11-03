import type { ReactNode } from "react";

/** Grupo de ajustes: un título y, debajo, una lista de filas. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-1 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
        {children}
      </div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  value: ReactNode;
  // Si se indica, la fila se puede pulsar (normalmente abre una ventana para cambiarla)
  onClick?: () => void;
  // Fila bloqueada: se ve pero no se puede cambiar. "hint" explica por qué.
  locked?: boolean;
  hint?: string;
}

/**
 * Fila de un ajuste: el nombre a la izquierda y el valor a la derecha. Si se
 * puede cambiar, es un botón con una flecha; si está bloqueada, lleva un
 * candado y no se puede pulsar.
 */
export function SettingsRow({ label, value, onClick, locked, hint }: SettingsRowProps) {
  const content = (
    <>
      <span className="shrink-0 text-sm text-gray-600">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">{value}</span>
        {locked ? (
          <span role="img" aria-label="Bloqueado" title={hint}>
            🔒
          </span>
        ) : onClick ? (
          <span aria-hidden="true" className="text-gray-400">
            ›
          </span>
        ) : null}
      </span>
    </>
  );

  if (onClick && !locked) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      title={hint}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
    >
      {content}
    </div>
  );
}
