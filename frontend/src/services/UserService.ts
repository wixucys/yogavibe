import ApiService, { type User } from './ApiService';

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

type UserId = string | number;

type StoredProfilesMap = Record<string, LocalProfileData>;

class UserService {
  // Получение профиля пользователя с сервера
  static async getProfile(): Promise<User> {
    try {
      console.log('UserService: Getting user profile from server...');
      const userData = await ApiService.getCurrentUser();
      console.log('UserService: Profile received:', userData);
      return userData;
    } catch (error) {
      console.error('UserService: Error fetching profile:', error);
      throw error;
    }
  }

  // Обновление профиля пользователя
  static async updateProfile(profileData: UpdateProfileInput): Promise<User> {
    try {
      console.log('UserService: Updating profile with:', profileData);

      const backendData = {
        city: profileData.city || null,
        yoga_style: profileData.yoga_style || profileData.knownStyles || null,
        experience: profileData.experience || profileData.experienceYears || null,
        goals: profileData.goals || null,
      };

      console.log('UserService: Sending to backend:', backendData);

      const response = await ApiService.updateUserProfile(backendData);
      console.log('UserService: Profile updated successfully:', response);

      if (response) {
        ApiService.setUserData(response);
      }

      return response;
    } catch (error) {
      console.error('UserService: Error updating profile:', error);
      throw error;
    }
  }

  // Загрузка фото профиля (локальное хранилище)
  static saveProfilePhoto(userId: UserId, photoData: string | null): boolean {
    try {
      const allProfiles = this.getAllProfiles();
      const key = String(userId);

      if (!allProfiles[key]) {
        allProfiles[key] = {};
      }

      allProfiles[key].photo = photoData;
      localStorage.setItem('yogavibe_profiles', JSON.stringify(allProfiles));
      return true;
    } catch (error) {
      console.error('UserService: Error saving photo:', error);
      return false;
    }
  }

  // Получение локальных данных профиля
  static getLocalProfile(userId: UserId): LocalProfileData {
    try {
      const allProfiles = this.getAllProfiles();
      return allProfiles[String(userId)] || {};
    } catch (error) {
      console.error('UserService: Error getting local profile:', error);
      return {};
    }
  }

  // Сохранение локальных данных профиля
  static saveLocalProfile(userId: UserId, profileData: LocalProfileData): boolean {
    try {
      const allProfiles = this.getAllProfiles();
      const key = String(userId);

      allProfiles[key] = {
        ...(allProfiles[key] || {}),
        ...profileData,
      };

      localStorage.setItem('yogavibe_profiles', JSON.stringify(allProfiles));
      return true;
    } catch (error) {
      console.error('UserService: Error saving local profile:', error);
      return false;
    }
  }

  private static getAllProfiles(): StoredProfilesMap {
    try {
      const raw = localStorage.getItem('yogavibe_profiles');
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw) as unknown;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as StoredProfilesMap;
      }

      return {};
    } catch (error) {
      console.error('UserService: Error parsing profiles from localStorage:', error);
      return {};
    }
  }
}

export default UserService;