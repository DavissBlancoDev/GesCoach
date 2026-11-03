import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { useLogout } from "../hooks/useLogout";
import Avatar from "./Avatar";

/**
 * Menú desplegable del usuario: "Hola, [nombre]" con su foto de iniciales, y
 * dentro Mi perfil, Ajustes del club y Cerrar sesión. Se cierra al elegir una
 * opción, al pulsar fuera o con la tecla Escape.
 */
function UserMenu() {
  const { data: user } = useSession();
  const logoutMutation = useLogout();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass = "flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100"
      >
        {user && <Avatar name={user.name} surname={user.surname} size="sm" />}
        <span className="max-w-[8rem] truncate text-sm font-medium">Hola, {user?.name}</span>
        <span aria-hidden="true" className="text-xs text-gray-500">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-52 rounded border border-gray-200 bg-white py-1 shadow-lg"
        >
          <Link role="menuitem" to="/perfil" onClick={() => setOpen(false)} className={itemClass}>
            <span aria-hidden="true">👤</span> Mi perfil
          </Link>
          <Link role="menuitem" to="/ajustes" onClick={() => setOpen(false)} className={itemClass}>
            <span aria-hidden="true">⚙️</span> Ajustes del club
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <span aria-hidden="true">🚪</span> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
