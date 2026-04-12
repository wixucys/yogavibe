import { formatMoscowDate } from '../utils/dateTime';

export type MentorId = number | string;
export type MentorGender = 'male' | 'female' | string;

// ===== API (как приходит с бэка) =====
export interface MentorApi {
  id: MentorId;
  user_id?: number;

  name: string;
  description?: string;
  gender: MentorGender;
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
  id: MentorId;

  name: string;
  description?: string;
  gender: MentorGender;
  city: string;
  price: number;
  yogaStyle: string;

  rating?: number;
  experienceYears?: number;
  photoUrl?: string | null;

  isAvailable?: boolean;
  createdAt?: string;
}

// ===== Тип для детального экрана =====
export interface MentorProfile extends Mentor {
  experience: string;
  registrationDate: string;
}

// ===== Для Booking используем тот же нормализованный тип =====
export type BookingMentor = Mentor;

// ===== Фильтры =====
export interface MentorFilters {
  city?: string;
  yoga_style?: string;
  skip?: number;
  limit?: number;
}

export interface MentorCreatePayload {
  user_id: number;
  name: string;
  description: string;
  gender: string;
  city: string;
  price: number;
  yoga_style: string;
  rating?: number;
  experience_years?: number;
  photo_url?: string | null;
  is_available?: boolean;
}

export interface MentorAdminUpdatePayload {
  name?: string;
  description?: string;
  gender?: string;
  city?: string;
  price?: number;
  yoga_style?: string;
  rating?: number;
  experience_years?: number;
  photo_url?: string | null;
  is_available?: boolean;
}

export interface MentorSelfUpdatePayload {
  name?: string;
  description?: string;
  gender?: string;
  city?: string;
  price?: number;
  yoga_style?: string;
  experience_years?: number;
  photo_url?: string | null;
  is_available?: boolean;
}

// ===== Мапперы =====
export const mapMentorFromApi = (mentor: MentorApi): Mentor => ({
  id: mentor.id,
  name: mentor.name,
  description: mentor.description,
  gender: mentor.gender,
  city: mentor.city,
  price: mentor.price,
  yogaStyle: mentor.yoga_style,
  rating: mentor.rating,
  experienceYears: mentor.experience_years,
  photoUrl: mentor.photo_url,
  isAvailable: mentor.is_available,
  createdAt: mentor.created_at,
});

export const mapMentorToBooking = (mentor: MentorApi | Mentor): BookingMentor => {
  if ('yogaStyle' in mentor) {
    return mentor;
  }

  return mapMentorFromApi(mentor);
};

export const mapMentorToProfile = (mentor: MentorApi | Mentor): MentorProfile => {
  const normalized = 'yogaStyle' in mentor ? mentor : mapMentorFromApi(mentor);

  return {
    ...normalized,
    experience:
      normalized.experienceYears !== undefined
        ? `${normalized.experienceYears} лет`
        : 'Не указано',
    registrationDate: normalized.createdAt
      ? formatMoscowDate(normalized.createdAt)
      : 'Не указано',
  };
};
