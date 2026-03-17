// ===== API (как приходит с бэка) =====
export interface MentorApi {
  id: number | string;
  user_id?: number;

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
  created_at?: string;
}

// ===== Нормализованный тип (используется в приложении) =====
export interface Mentor {
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
  createdAt?: string;
}

// ===== Для Booking =====
export interface BookingMentor {
  id: number | string;
  name: string;
  gender: string;
  city: string;
  price: number;
  yogaStyle: string;

  description?: string;
  rating?: number;
  experienceYears?: number;
  photoUrl?: string | null;
  isAvailable?: boolean;
}

// ===== Фильтры =====
export interface MentorFilters {
  city?: string;
  yoga_style?: string;
  skip?: number;
  limit?: number;
}

// ===== Маппер API → UI =====
export const mapMentorFromApi = (m: MentorApi): Mentor => ({
  id: m.id,
  name: m.name,
  description: m.description,
  gender: m.gender,
  city: m.city,
  price: m.price,
  yogaStyle: m.yoga_style,
  rating: m.rating,
  experienceYears: m.experience_years,
  photoUrl: m.photo_url,
  isAvailable: m.is_available,
  createdAt: m.created_at,
});

// ===== Маппер в Booking =====
export const mapMentorToBooking = (m: MentorApi): BookingMentor => ({
  id: m.id,
  name: m.name,
  gender: m.gender,
  city: m.city,
  price: m.price,
  yogaStyle: m.yoga_style,
  description: m.description,
  rating: m.rating,
  experienceYears: m.experience_years,
  photoUrl: m.photo_url,
  isAvailable: m.is_available,
});