import { useQuery } from "@tanstack/react-query";
import { getCalendarNotes, type CalendarNote } from "../api/calendarNotes";

export function useCalendarNotes(teamId: string | undefined) {
  return useQuery<CalendarNote[]>({
    queryKey: ["calendar-notes", teamId],
    queryFn: () => getCalendarNotes(teamId as string),
    enabled: Boolean(teamId),
  });
}
