import { useEffect, useId, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Ventana emergente. Se cierra con la tecla Escape o pulsando fuera de ella.
 * Es la base de todos los popups de la aplicación.
 */
function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-sm overflow-y-auto rounded bg-white p-4 shadow-lg"
      >
        <h3 id={titleId} className="mb-3 text-lg font-semibold">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

export default Modal;
