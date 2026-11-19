import type { SelectHTMLAttributes } from "react";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  // Si se indica, la opción vacía se puede volver a elegir, con este texto
  // (por ejemplo "Sin nacionalidad"). Si no, aparece "Selecciona..." y no se
  // puede elegir: pensado para los campos obligatorios.
  emptyLabel?: string;
}

/** Desplegable con etiqueta y mensaje de error opcional. */
function FormSelect({ label, options, error, emptyLabel, id, ...selectProps }: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 outline-none transition focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10"
        {...selectProps}
      >
        {emptyLabel ? (
          <option value="">{emptyLabel}</option>
        ) : (
          <option value="" disabled>
            Selecciona...
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default FormSelect;
