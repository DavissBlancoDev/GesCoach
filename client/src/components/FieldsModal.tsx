import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { getFieldErrors } from "../api/client";
import DateSelect from "./DateSelect";
import FormField from "./FormField";
import FormSelect from "./FormSelect";
import Modal from "./Modal";

// Descripción de cada campo que puede llevar el formulario de una ventana
interface BaseField {
  name: string;
  label: string;
  required?: boolean;
}
export interface TextField extends BaseField {
  kind: "text";
  type?: "text" | "email" | "password" | "number";
  autoComplete?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}
export interface SelectField extends BaseField {
  kind: "select";
  options: { value: string; label: string }[];
}
export interface DateField extends BaseField {
  kind: "date";
  minYear: number;
  maxYear: number;
}
export interface ColorField extends BaseField {
  kind: "color";
}
export type FieldConfig = TextField | SelectField | DateField | ColorField;

interface FieldsModalProps {
  title: string;
  description?: string;
  fields: FieldConfig[];
  // Valor inicial de cada campo, por su nombre. Todo va como texto.
  initial: Record<string, string>;
  submitLabel?: string;
  // Comprobación antes de enviar: devuelve el mensaje de error, o null si todo va bien
  validate?: (values: Record<string, string>) => string | null;
  // Guarda los valores. Si lanza un error, se muestra en la ventana.
  onSave: (values: Record<string, string>) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Ventana emergente con un formulario de uno o varios campos. Sirve para casi
 * todos los ajustes (nombre, correo, fecha, colores...): solo cambian los
 * campos que se le pasan y lo que hace "onSave".
 */
function FieldsModal({
  title,
  description,
  fields,
  initial,
  submitLabel = "Guardar",
  validate,
  onSave,
  onClose,
}: FieldsModalProps) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => onSave(values),
    onSuccess: onClose,
  });

  // Errores por campo que devuelve el servidor al validar
  const fieldErrors = getFieldErrors(mutation.error);
  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate?.(values) ?? null;
    setValidationError(problem);
    if (problem) return;
    mutation.mutate();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {description && <p className="text-sm text-gray-600">{description}</p>}

        {fields.map((field) => {
          const id = `field-${field.name}`;
          const error = fieldErrors[field.name]?.[0];

          if (field.kind === "select") {
            return (
              <FormSelect
                key={field.name}
                id={id}
                label={field.label}
                value={values[field.name] ?? ""}
                onChange={(e) => setValue(field.name, e.target.value)}
                options={field.options}
                error={error}
                required={field.required}
              />
            );
          }
          if (field.kind === "date") {
            return (
              <DateSelect
                key={field.name}
                id={id}
                label={field.label}
                value={values[field.name] ?? ""}
                onChange={(value) => setValue(field.name, value)}
                minYear={field.minYear}
                maxYear={field.maxYear}
                error={error}
                required={field.required}
              />
            );
          }
          if (field.kind === "color") {
            return (
              <FormField
                key={field.name}
                id={id}
                label={field.label}
                type="color"
                className="mt-1 h-10 w-full rounded border border-gray-300"
                value={values[field.name] ?? "#000000"}
                onChange={(e) => setValue(field.name, e.target.value)}
                error={error}
              />
            );
          }
          return (
            <FormField
              key={field.name}
              id={id}
              label={field.label}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              min={field.min}
              max={field.max}
              value={values[field.name] ?? ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              error={error}
              required={field.required}
            />
          );
        })}

        {validationError && <p className="text-sm text-red-600">{validationError}</p>}
        {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default FieldsModal;
