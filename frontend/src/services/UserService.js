import ApiService from './ApiService';

class UserService {
  // Получение профиля пользователя с сервера
  static async getProfile() {
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
  static async updateProfile(profileData) {
    try {
      console.log('UserService: Updating profile with:', profileData);
      
      // Преобразуем данные в формат бэкенда (UserUpdate схема)
      const backendData = {
        city: profileData.city || null,
        yoga_style: profileData.yoga_style || profileData.knownStyles || null,
        experience: profileData.experience || profileData.experienceYears || null,
        goals: profileData.goals || null
      };
      
      console.log('UserService: Sending to backend:', backendData);
      
      const response = await ApiService.updateUserProfile(backendData);
      console.log('UserService: Profile updated successfully:', response);
      
      // Обновляем данные пользователя в localStorage
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
  static saveProfilePhoto(userId, photoData) {
    try {
      const allProfiles = JSON.parse(localStorage.getItem('yogavibe_profiles') || '{}');
      if (!allProfiles[userId]) {
        allProfiles[userId] = {};
      }
      allProfiles[userId].photo = photoData;
      localStorage.setItem('yogavibe_profiles', JSON.stringify(allProfiles));
      return true;
    } catch (error) {
      console.error('UserService: Error saving photo:', error);
      return false;
    }
  }

  // Получение локальных данных профиля
  static getLocalProfile(userId) {
    try {
      const allProfiles = JSON.parse(localStorage.getItem('yogavibe_profiles') || '{}');
      return allProfiles[userId] || {};
    } catch (error) {
      console.error('UserService: Error getting local profile:', error);
      return {};
    }
  }

  // Сохранение локальных данных профиля
  static saveLocalProfile(userId, profileData) {
    try {
      const allProfiles = JSON.parse(localStorage.getItem('yogavibe_profiles') || '{}');
      allProfiles[userId] = profileData;
      localStorage.setItem('yogavibe_profiles', JSON.stringify(allProfiles));
      return true;
    } catch (error) {
      console.error('UserService: Error saving local profile:', error);
      return false;
    }
  }
}

export default UserService;