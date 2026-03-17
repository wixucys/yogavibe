export interface Mentor {
  id: number;
  user_id: number;

  name: string;
  description: string;
  gender: string;
  city: string;
  price: number;
  yoga_style: string;

  rating: number;
  experience_years: number;
  photo_url?: string | null;

  is_available: boolean;

  created_at: string;
}

export interface MentorFilters {
  city?: string;
  yoga_style?: string;
  skip?: number;
  limit?: number;
}

export interface MentorApiResponse {
  id: number | string;
  name: string;
  description?: string;
  gender: string;
  city: string;
  price: number;
  yoga_style: string;
  rating?: number;
  experience_years?: number;
  photo_url?: string | null;
  is_available?: boolean;
  [key: string]: unknown;
}

export interface BookingMentor {
  id: number | string;
  name: string;
  description?: string;
  gender: string;
  city: string;
  price: number;
  yogaStyle: string;
  rating?: number;
  experienceYears?: number;
  photoUrl?: string | null;
  isAvailable?: boolean;
  availability?: string[];
}