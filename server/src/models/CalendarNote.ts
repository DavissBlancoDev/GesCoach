import { Schema, model, Types } from "mongoose";

export interface ICalendarNote {
  team: Types.ObjectId;
  season: Types.ObjectId;
  date: Date;
  startTime?: string;
  title: string;
  details?: string;
}

const calendarNoteSchema = new Schema<ICalendarNote>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    season: { type: Schema.Types.ObjectId, ref: "Season", required: true, index: true },
    date: { type: Date, required: true },
    startTime: { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Formato esperado: HH:MM"] },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    details: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

calendarNoteSchema.index({ season: 1, date: 1, startTime: 1 });

export const CalendarNote = model<ICalendarNote>("CalendarNote", calendarNoteSchema);
