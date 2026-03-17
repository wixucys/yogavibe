import React, { JSX, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import './MentorProfileScreen.css';

interface InfoFieldProps {
  label: string;
  value?: string | number | null;
}

const InfoField = ({ label, value }: InfoFieldProps): JSX.Element => (
  <div className="field-group">
    <label>{label}:</label>
    <div className="field-value">{value || 'Не указано'}</div>
  </div>
);

interface MentorApiResponse {
  id: number | string;
  name: string;
  description?: string;
  gender: string;
  city: string;
  price: number;
  yoga_style: string;
  rating: number;
  experience_years: number;
  photo_url?: string | null;
  is_available?: boolean;
  created_at: string;
}

interface MentorProfile {
  id: number | string;
  name: string;
  description?: string;
  gender: string;
  city: string;
  price: number;
  yogaStyle: string;
  rating: number;
  experienceYears: number;
  photoUrl?: string | null;
  isAvailable?: boolean;
  experience: string;
  registrationDate: string;
}

const MentorProfileScreen = (): JSX.Element | null => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mentorId) {
      setError('Некорректный ID ментора');
      setLoading(false);
      return;
    }

    loadMentorData();
  }, [mentorId]);

  const loadMentorData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.request<MentorApiResponse>(
        `/mentors/${mentorId}`,
        { method: 'GET' }
      );

      if (!response) {
        setError('Ментор не найден');
        return;
      }

      const mapped: MentorProfile = {
        id: response.id,
        name: response.name,
        description: response.description,
        gender: response.gender,
        city: response.city,
        price: response.price,
        yogaStyle: response.yoga_style,
        rating: response.rating,
        experienceYears: response.experience_years,
        photoUrl: response.photo_url,
        isAvailable: response.is_available,
        experience: `${response.experience_years} лет`,
        registrationDate: new Date(response.created_at).toLocaleDateString('ru-RU'),
      };

      setMentor(mapped);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить профиль ментора');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = (): void => {
    navigate('/main');
  };

  const handleBookSession = (): void => {
    if (!mentor || mentor.isAvailable === false) return;

    navigate(`/booking/${mentor.id}`, { state: { mentor } });
  };

  if (loading) {
    return (
      <div className="mentor-profile-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка профиля ментора...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mentor-profile-not-found">
        <h2>{error}</h2>
        <button onClick={handleBackClick} className="back-btn">
          Вернуться назад
        </button>
      </div>
    );
  }

  if (!mentor) {
    return null;
  }

  return (
    <div className="mentor-profile-page">
      <div className="mentor-profile-content">
        <div className="mentor-profile-card">

          <div className="mentor-profile-header">
            <button onClick={handleBackClick} className="back-btn">
              ← Назад
            </button>
            <h1>Профиль ментора</h1>
          </div>

          <div className="mentor-profile-layout">

            <div className="mentor-profile-left">
              <div className="mentor-photo-section">
                {mentor.photoUrl ? (
                  <img src={mentor.photoUrl} alt={mentor.name} />
                ) : (
                  <div className="mentor-photo-text">
                    {mentor.gender === 'female' ? '👩' : '👨'}
                  </div>
                )}
              </div>

              <h2>{mentor.name}</h2>

              <div>⭐ {mentor.rating}</div>
              <div>{mentor.city}</div>
              <div>{mentor.price} ₽</div>

              <button
                onClick={handleBookSession}
                className="book-btn-large"
                disabled={mentor.isAvailable === false}
              >
                {mentor.isAvailable === false
                  ? 'НЕДОСТУПЕН'
                  : 'ЗАПИСАТЬСЯ'}
              </button>
            </div>

            <div className="mentor-profile-right">

              <div className="mentor-section">
                <h3>О МЕНТОРЕ</h3>
                <InfoField label="Стиль йоги" value={mentor.yogaStyle} />
                <InfoField label="Опыт" value={mentor.experience} />
                <InfoField label="Дата регистрации" value={mentor.registrationDate} />
              </div>

              {mentor.description && (
                <div className="mentor-section">
                  <h3>Описание</h3>
                  <p>{mentor.description}</p>
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorProfileScreen;