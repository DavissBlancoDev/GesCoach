interface AvatarProps {
  name: string;
  surname: string;
  size?: "sm" | "lg";
}

// Tamaños del círculo y de las iniciales. Las clases van completas (no se
// pueden construir con texto) para que Tailwind las detecte al compilar.
const SIZES = {
  sm: "h-9 w-9 text-sm",
  lg: "h-24 w-24 text-3xl",
};

/**
 * Foto de perfil. Mientras no se pueda subir una foto, es un círculo con las
 * iniciales del nombre y el primer apellido (David Blanco -> DB).
 */
function Avatar({ name, surname, size = "sm" }: AvatarProps) {
  const initials = `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();

  return (
    <span
      role="img"
      aria-label={`${name} ${surname}`}
      className={`flex shrink-0 items-center justify-center rounded-full bg-green-700 font-bold text-white ${SIZES[size]}`}
    >
      {initials}
    </span>
  );
}

export default Avatar;
