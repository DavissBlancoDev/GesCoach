import { api } from "./client";

export interface CalendarNote {
  id: string;
  date: string;
  startTime?: string;
  title: string;
  details?: string;
}

export interface CalendarNoteData {
  date: string;
  startTime?: string;
  title: string;
  details?: string;
}

const base = (teamId: string) => `/teams/${teamId}/calendar-notes`;

export const getCalendarNotes = (teamId: string) => api<CalendarNote[]>(base(teamId));
export const createCalendarNote = (teamId: string, data: CalendarNoteData) =>
  api<CalendarNote>(base(teamId), { method: "POST", body: JSON.stringify(data) });
export const deleteCalendarNote = (teamId: string, noteId: string) =>
  api<void>(`${base(teamId)}/${noteId}`, { method: "DELETE" });
