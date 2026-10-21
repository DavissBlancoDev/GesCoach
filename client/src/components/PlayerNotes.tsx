import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlayerNote, deletePlayerNote, updatePlayerNote } from "../api/playerNotes";
import { usePlayerNotes } from "../hooks/usePlayerNotes";

interface PlayerNotesProps {
  teamId: string;
  playerId: string;
}

// Fecha y hora de una nota, en la zona horaria del navegador
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Notas del entrenador sobre un jugador: una lista de entradas con fecha,
 * con campo para añadir y botones para editar y borrar cada una.
 * Solo se muestra al entrenador principal (el servidor lo comprueba).
 */
function PlayerNotes({ teamId, playerId }: PlayerNotesProps) {
  const { data: notes, isPending, isError } = usePlayerNotes(teamId, playerId);
  const queryClient = useQueryClient();

  const [newText, setNewText] = useState("");
  // Nota que se está editando y su texto; nota pendiente de confirmar el borrado
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryKey = ["playerNotes", teamId, playerId];
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (text: string) => createPlayerNote(teamId, playerId, text),
    onSuccess: async () => {
      setNewText("");
      await refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, text }: { noteId: string; text: string }) =>
      updatePlayerNote(teamId, playerId, noteId, text),
    onSuccess: async () => {
      setEditingId(null);
      await refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deletePlayerNote(teamId, playerId, noteId),
    onSuccess: async () => {
      setDeletingId(null);
      await refresh();
    },
  });

  /** Añadir una nota nueva. */
  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (newText.trim() === "") return;
    createMutation.mutate(newText);
  }

  /** Guardar los cambios de una nota en edición. */
  function handleSaveEdit(e: FormEvent, noteId: string) {
    e.preventDefault();
    if (editText.trim() === "") return;
    updateMutation.mutate({ noteId, text: editText });
  }

  return (
    <section className="mt-4 rounded border border-gray-200 p-4">
      <h2 className="text-lg font-semibold">Notas del entrenador</h2>
      <p className="mb-3 text-xs text-gray-500">
        Solo las ves tú. No anotes diagnósticos ni datos de salud, y escribe pensando en que un
        tutor podría pedir verlas.
      </p>

      {/* Nota nueva */}
      <form onSubmit={handleAdd} className="space-y-2">
        <label htmlFor="newNote" className="sr-only">
          Nueva nota
        </label>
        <textarea
          id="newNote"
          rows={3}
          maxLength={2000}
          placeholder="Escribe una nota..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {createMutation.isError && (
          <p className="text-sm text-red-600">{createMutation.error.message}</p>
        )}
        <button
          type="submit"
          disabled={createMutation.isPending || newText.trim() === ""}
          className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {createMutation.isPending ? "Guardando..." : "Añadir nota"}
        </button>
      </form>

      {isPending && <p className="mt-4 text-sm">Cargando notas...</p>}
      {isError && <p className="mt-4 text-sm text-red-600">No se han podido cargar las notas.</p>}
      {notes && notes.length === 0 && (
        <p className="mt-4 text-sm text-gray-600">Aún no hay notas sobre este jugador.</p>
      )}

      {/* Lista de notas, de la más reciente a la más antigua */}
      {notes && notes.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded bg-gray-50 p-3">
              {editingId === note.id ? (
                <form onSubmit={(e) => handleSaveEdit(e, note.id)} className="space-y-2">
                  <label htmlFor={`edit-${note.id}`} className="sr-only">
                    Editar nota
                  </label>
                  <textarea
                    id={`edit-${note.id}`}
                    rows={3}
                    maxLength={2000}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  {updateMutation.isError && (
                    <p className="text-sm text-red-600">{updateMutation.error.message}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded border border-gray-300 bg-white px-3 py-1 text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending || editText.trim() === ""}
                      className="rounded bg-green-700 px-3 py-1 text-sm text-white disabled:opacity-50"
                    >
                      {updateMutation.isPending ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* whitespace-pre-wrap respeta los saltos de línea que escribió el entrenador */}
                  <p className="whitespace-pre-wrap text-sm">{note.text}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDateTime(note.createdAt)}
                    {note.updatedAt !== note.createdAt && " · editada"}
                  </p>

                  {deletingId === note.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span>¿Borrar esta nota?</span>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="rounded border border-gray-300 bg-white px-3 py-1"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(note.id)}
                        className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "Borrando..." : "Sí, borrar"}
                      </button>
                      {deleteMutation.isError && (
                        <span className="text-red-600">{deleteMutation.error.message}</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditText(note.text);
                        }}
                        className="text-green-700 underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(note.id)}
                        className="text-red-700 underline"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PlayerNotes;
