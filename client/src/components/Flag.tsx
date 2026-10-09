import { countryName } from "../lib/countries";

/**
 * Bandera de un país a partir de su código de 2 letras.
 *
 * Usa imágenes de flagcdn.com en lugar de emojis porque Windows no dibuja
 * los emojis de bandera (muestra dos letras). Si algún día se quiere otra
 * fuente o alojar las imágenes en el propio proyecto, solo hay que
 * cambiar este componente.
 */
function Flag({ code }: { code?: string }) {
  if (!code) return null;

  const lower = code.toLowerCase();
  const name = countryName(code);

  return (
    <img
      src={`https://flagcdn.com/w20/${lower}.png`}
      srcSet={`https://flagcdn.com/w40/${lower}.png 2x`}
      width={20}
      alt={name}
      title={name}
      loading="lazy"
      className="inline-block h-auto w-5 rounded-sm"
    />
  );
}

export default Flag;
