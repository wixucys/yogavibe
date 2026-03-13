export type UserId = string | number;

export type UserRole = 'user' | 'mentor' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  city?: string | null;
  yoga_style?: string | null;
  experience?: string | null;
  goals?: string | null;
  created_at: string;
  is_active: boolean;
}

export interface LocalProfileData {
  age?: string;
  contactInfo?: string;
  knownStyles?: string;
  healthInfo?: string;
  preferredFormat?: string;
  meetingFrequency?: string;
  mentorshipDuration?: string;
  communicationStyle?: string;
  mentorPreferences?: string;
  additionalInfo?: string;
  photo?: string | null;
  [key: string]: unknown;
}

export interface UpdateProfileInput {
  city?: string | null;
  yoga_style?: string | null;
  knownStyles?: string | null;
  experience?: string | null;
  experienceYears?: string | null;
  goals?: string | null;
  [key: string]: unknown;
}