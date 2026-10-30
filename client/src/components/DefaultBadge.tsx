/**
 * Escudo genérico para los rivales, mientras no tengan el suyo. Es un SVG
 * propio, así que no depende de ninguna imagen externa.
 */
function DefaultBadge({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 text-gray-400 ${className}`}
      role="img"
      aria-label="Escudo"
    >
      <path
        d="M12 2 4 5v6c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5l-8-3Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default DefaultBadge;
