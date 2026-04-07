export type BookingId = string | number;
export type UserId = string | number;
export type MentorId = string | number;

export type BookingStatus = 'active' | 'completed' | 'cancelled';
export type SessionType = 'individual' | 'group';

export interface MentorResponse {
  id: MentorId;
  name?: string;
  city?: string;
  yoga_style?: string;
  [key: string]: unknown;
}

export interface BookingResponse {
  id: BookingId;
  mentor_id: MentorId;
  user_id?: UserId;
  mentor?: MentorResponse;
  session_date: string;
  duration_minutes: number;
  price: number;
  status?: BookingStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  session_type?: SessionType;
  [key: string]: unknown;
}

export interface Booking {
  id: BookingId;
  mentorId: MentorId;
  userId?: UserId;
  mentorName: string;
  mentorCity?: string;
  mentorYogaStyle?: string;
  sessionDate: string;
  durationMinutes: number;
  price: number;
  status: BookingStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  sessionType?: SessionType;
}

export interface CreateBookingInput {
  mentor_id: MentorId;
  session_date: string;
  duration_minutes: number;
  price?: number;
  notes?: string;
  session_type?: SessionType;
  mentorName?: string;
  [key: string]: unknown;
}

export interface UpdateBookingInput {
  session_date?: string;
  duration_minutes?: number;
  notes?: string;
  session_type?: SessionType;
  expected_updated_at?: string;
}

export interface StoredBooking extends Booking {
  userId?: UserId;
}

export interface StoredUser {
  id?: UserId;
  [key: string]: unknown;
}

export interface BookingData {
  mentor_id: MentorId;
  session_date: string;
  note?: string;
  [key: string]: unknown;
}