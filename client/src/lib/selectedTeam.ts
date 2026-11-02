// Equipo con el que se está trabajando. Se guarda en el navegador para que
// sobreviva a recargar la página, y se avisa a los componentes cuando cambia.
// Solo se guarda el identificador del equipo, no ningún dato.

const KEY = "gescoach.selectedTeam";
const listeners = new Set<() => void>();

// Valor actual. Se lee del almacenamiento una sola vez al cargar; si el
// navegador no lo permite, la selección dura lo que dure la página.
let selected: string | null = null;
try {
  selected = localStorage.getItem(KEY);
} catch {
  // Sin almacenamiento disponible: se sigue en memoria
}

/** Identificador del equipo elegido, o null si no se ha elegido ninguno. */
export const getSelectedTeamId = () => selected;

/** Elige un equipo (o ninguno, con null) y avisa a quien lo esté mostrando. */
export function setSelectedTeamId(teamId: string | null): void {
  selected = teamId;
  try {
    if (teamId) localStorage.setItem(KEY, teamId);
    else localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento disponible: se sigue en memoria
  }
  listeners.forEach((listener) => listener());
}

/** Para useSyncExternalStore: permite suscribirse a los cambios de equipo. */
export function subscribeSelectedTeam(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
