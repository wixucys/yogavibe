export interface BookingData {
  mentor_id: string | number;
  session_date: string;
  note?: string;
  [key: string]: unknown;
}