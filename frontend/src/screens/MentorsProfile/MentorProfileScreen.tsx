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

interface ReviewItemProps {
  author: string;
  date: string;
  text: string;
}

const ReviewItem = ({ author, date, text }: ReviewItemProps): JSX.Element => (
  <div className="review-item">
    <div className="review-header">
      <span className="review-author">{author}</span>
      <span className="review-date">{date}</span>
    </div>
    <div className="review-text">{text}</div>
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
  [key: string]: unknown;
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
  certification: string;
  education: string;
  specialization: string;
  languages: string[];
  reviewsCount: number;
  availability: string;
  certificateNumber: string;
  registrationDate: string;
  philosophy: string;
  achievements: string;
}

const MentorProfileScreen = (): JSX.Element => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMentorData();
  }, [mentorId]);

  const loadMentorData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching mentor ${mentorId} from API...`);

      const response = await ApiService.request<MentorApiResponse>(`/mentors/${mentorId}`, {
        method: 'GET',
      });

      console.log('Mentor data received:', response);

      const enhancedMentor: MentorProfile = {
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
        certification: 'Сертифицированный инструктор',
        education: 'Международная школа йоги',
        specialization: 'Индивидуальные и групповые занятия',
        languages: ['Русский', 'Английский'],
        reviewsCount: Math.round(response.rating * 10),
        availability: 'По предварительной записи',
        certificateNumber: `CERT-${response.id.toString().padStart(6, '0')}`,
        registrationDate: new Date(response.created_at).toLocaleDateString('ru-RU'),
        philosophy:
          'Мой подход основан на индивидуальной работе с каждым учеником. Я верю, что йога - это не просто физическая практика, а путь к гармонии тела и разума.',
        achievements: `• ${response.experience_years} лет опыта преподавания\n• Провел более ${response.experience_years * 100} сессий\n• Специализация: ${response.yoga_style}\n• Работает в ${response.city}`,
      };

      setMentor(enhancedMentor);
    } catch (error: unknown) {
      console.error('Error loading mentor:', error);
      setError('Не удалось загрузить профиль ментора');

      const mockMentors: MentorProfile[] = [
        {
          id: 1,
          name: 'Анна Иванова',
          description: 'Опытный инструктор по хатха йоге с 5-летним стажем',
          gender: 'female',
          city: 'Москва',
          price: 2500,
          yogaStyle: 'Хатха',
          experienceYears: 5,
          experience: '5 лет',
          certification: 'Сертифицированный инструктор',
          education: 'Международная школа йоги',
          specialization: 'Индивидуальные и групповые занятия',
          languages: ['Русский', 'Английский'],
          rating: 4.8,
          reviewsCount: 42,
          photoUrl: null,
          isAvailable: true,
          availability: 'По предварительной записи',
          certificateNumber: 'CERT-000001',
          registrationDate: '24.07.2024',
          philosophy:
            'Мой подход основан на индивидуальной работе с каждым учеником. Я верю, что йога - это не просто физическая практика, а путь к гармонии тела и разума.',
          achievements:
            '• 5 лет опыта преподавания\n• Провел более 500 сессий\n• Специализация: Хатха йога\n• Работает в Москве',
        },
      ];

      const parsedMentorId = mentorId ? Number(mentorId) : NaN;
      const foundMentor = mockMentors.find((m) => Number(m.id) === parsedMentorId);

      if (foundMentor) {
        setMentor(foundMentor);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = (): void => {
    navigate('/main');
  };

  const handleBookSession = (): void => {
    if (mentor) {
      navigate(`/booking/${mentor.id}`, { state: { mentor } });
    }
  };

  if (loading) {
    return (
      <div className="mentor-profile-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка профиля ментора...</p>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="mentor-profile-not-found">
        <h2>Ментор не найден</h2>
        <button onClick={handleBackClick} className="back-btn" type="button">
          Вернуться к списку менторов
        </button>
      </div>
    );
  }

  return (
    <div className="mentor-profile-page">
      <div className="mentor-profile-content">
        <div className="mentor-profile-card">
          <div className="mentor-profile-header">
            <button
              onClick={handleBackClick}
              className="back-btn"
              aria-label="Вернуться к списку менторов"
              type="button"
            >
              ← Назад к менторам
            </button>
            <h1>Профиль ментора</h1>
          </div>

          <div className="mentor-profile-layout">
            <div className="mentor-profile-left">
              <div className="mentor-photo-section">
                <div className="mentor-photo-placeholder">
                  {mentor.photoUrl ? (
                    <img
                      src={mentor.photoUrl}
                      alt={`Фото ментора ${mentor.name}`}
                      className="mentor-photo"
                    />
                  ) : (
                    <div className="mentor-photo-text">
                      <div className="mentor-icon">
                        {mentor.gender === 'female' ? '👩' : '👨'}
                      </div>
                      <div>{mentor.name.split(' ')[0]}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mentor-basic-info">
                <h2 className="mentor-name">{mentor.name}</h2>
                <div className="mentor-rating">
                  <span className="rating-stars">★</span>
                  <span className="rating-value">{mentor.rating}</span>
                  <span className="reviews-count">({mentor.reviewsCount} отзывов)</span>
                </div>
                <div className="mentor-price-tag">
                  <span className="price-label">Стоимость сессии:</span>
                  <span className="price-value">{mentor.price} ₽/час</span>
                </div>
                <div className="mentor-location">
                  <span className="location-icon">📍</span>
                  <span>{mentor.city}</span>
                </div>
              </div>

              <button onClick={handleBookSession} className="book-btn-large" type="button">
                ЗАПИСАТЬСЯ НА СЕССИЮ
              </button>
            </div>

            <div className="mentor-profile-right">
              <div className="sections-container">
                <div className="mentor-section">
                  <h3>О МЕНТОРЕ</h3>
                  <InfoField label="Стиль йоги" value={mentor.yogaStyle} />
                  <InfoField label="Опыт преподавания" value={mentor.experience} />
                  <InfoField label="Специализация" value={mentor.specialization} />
                  <InfoField label="Доступность" value={mentor.availability} />
                </div>

                <div className="mentor-section">
                  <h3>ОБРАЗОВАНИЕ И СЕРТИФИКАЦИЯ</h3>
                  <InfoField label="Образование" value={mentor.education} />
                  <InfoField label="Сертификация" value={mentor.certification} />
                  <InfoField label="Номер сертификата" value={mentor.certificateNumber} />
                  <InfoField label="Дата регистрации" value={mentor.registrationDate} />
                </div>

                <div className="mentor-section">
                  <h3>КОНТАКТНАЯ ИНФОРМАЦИЯ</h3>
                  <InfoField label="Город" value={mentor.city} />
                  <InfoField label="Языки" value={mentor.languages.join(', ')} />
                  <InfoField label="Способ связи" value="Через платформу YogaVibe" />
                </div>

                <div className="mentor-section">
                  <h3>ФИЛОСОФИЯ И ПОДХОД</h3>
                  <div className="field-group full-width">
                    <div className="field-value philosophy-text">{mentor.philosophy}</div>
                  </div>
                </div>

                <div className="mentor-section">
                  <h3>ДОСТИЖЕНИЯ</h3>
                  <div className="field-group full-width">
                    <div className="field-value achievements-text">{mentor.achievements}</div>
                  </div>
                </div>

                <div className="mentor-section">
                  <h3>ОТЗЫВЫ УЧЕНИКОВ</h3>
                  <div className="reviews-list">
                    <ReviewItem
                      author="Мария С."
                      date="15.01.2024"
                      text="Отличный специалист! Очень внимательный и профессиональный подход. После занятий чувствую себя значительно лучше."
                    />
                    <ReviewItem
                      author="Алексей К."
                      date="10.01.2024"
                      text={`${mentor.name} - настоящий профессионал. Помог мне справиться с болями в спине и улучшить осанку. Рекомендую!`}
                    />
                    <ReviewItem
                      author="Елена В."
                      date="05.01.2024"
                      text="Занимаюсь уже 3 месяца, прогресс налицо. Стала более гибкой и спокойной. Спасибо за индивидуальный подход!"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorProfileScreen;