import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import './MentorProfileScreen.css';

// Компонент поля информации
const InfoField = ({ label, value }) => (
  <div className="field-group">
    <label>{label}:</label>
    <div className="field-value">{value || 'Не указано'}</div>
  </div>
);

// Компонент отзыва
const ReviewItem = ({ author, date, text }) => (
  <div className="review-item">
    <div className="review-header">
      <span className="review-author">{author}</span>
      <span className="review-date">{date}</span>
    </div>
    <div className="review-text">{text}</div>
  </div>
);

const MentorProfileScreen = () => {
  const { mentorId } = useParams();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMentorData();
  }, [mentorId]);

  const loadMentorData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching mentor ${mentorId} from API...`);
      const response = await ApiService.request(`/mentors/${mentorId}`, {
        method: 'GET'
      });
      
      console.log('Mentor data received:', response);
      
      // Дополняем данными для профиля
      const enhancedMentor = {
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
        
        // Дополнительные поля для профиля
        experience: `${response.experience_years} лет`,
        certification: "Сертифицированный инструктор",
        education: "Международная школа йоги",
        specialization: "Индивидуальные и групповые занятия",
        languages: ["Русский", "Английский"],
        reviewsCount: Math.round(response.rating * 10),
        availability: "По предварительной записи",
        certificateNumber: "CERT-" + response.id.toString().padStart(6, '0'),
        registrationDate: new Date(response.created_at).toLocaleDateString('ru-RU'),
        philosophy: "Мой подход основан на индивидуальной работе с каждым учеником. Я верю, что йога - это не просто физическая практика, а путь к гармонии тела и разума.",
        achievements: `• ${response.experience_years} лет опыта преподавания\n• Провел более ${response.experience_years * 100} сессий\n• Специализация: ${response.yoga_style}\n• Работает в ${response.city}`
      };
      
      setMentor(enhancedMentor);
    } catch (error) {
      console.error('Error loading mentor:', error);
      setError('Не удалось загрузить профиль ментора');
      
      // Fallback на моковые данные
      const mockMentors = [
        { 
          id: 1, 
          name: "Анна Иванова", 
          description: "Опытный инструктор по хатха йоге с 5-летним стажем",
          gender: "female", 
          city: "Москва", 
          price: 2500, 
          yogaStyle: "Хатха",
          experience: "5 лет",
          certification: "Сертифицированный инструктор",
          education: "Международная школа йоги",
          specialization: "Индивидуальные и групповые занятия",
          languages: ["Русский", "Английский"],
          rating: 4.8,
          reviewsCount: 42,
          photo: null,
          availability: "По предварительной записи",
          certificateNumber: "CERT-000001",
          registrationDate: "24.07.2024",
          philosophy: "Мой подход основан на индивидуальной работе с каждым учеником. Я верю, что йога - это не просто физическая практика, а путь к гармонии тела и разума.",
          achievements: "• 5 лет опыта преподавания\n• Провел более 500 сессий\n• Специализация: Хатха йога\n• Работает в Москве"
        },
      ];
      
      const foundMentor = mockMentors.find(m => m.id === parseInt(mentorId));
      if (foundMentor) {
        setMentor(foundMentor);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/main');
  };

  const handleBookSession = () => {
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
        <button onClick={handleBackClick} className="back-btn">
          Вернуться к списку менторов
        </button>
      </div>
    );
  }

  return (
    <div className="mentor-profile-page">
      <div className="mentor-profile-content">
        <div className="mentor-profile-card">
          {/* Заголовок с кнопкой назад */}
          <div className="mentor-profile-header">
            <button 
              onClick={handleBackClick}
              className="back-btn"
              aria-label="Вернуться к списку менторов"
            >
              ← Назад к менторам
            </button>
            <h1>Профиль ментора</h1>
          </div>

          {/* Двухколоночный лейаут */}
          <div className="mentor-profile-layout">
            {/* Левая колонка - фото и основная информация */}
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
                      <div className="mentor-icon">{mentor.gender === 'female' ? '👩' : '👨'}</div>
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

              {/* Кнопка записи */}
              <button
                onClick={handleBookSession}
                className="book-btn-large"
              >
                ЗАПИСАТЬСЯ НА СЕССИЮ
              </button>
            </div>

            {/* Правая колонка - анкета ментора */}
            <div className="mentor-profile-right">
              <div className="sections-container">
                {/* Информация о менторе */}
                <div className="mentor-section">
                  <h3>О МЕНТОРЕ</h3>
                  <InfoField label="Стиль йоги" value={mentor.yogaStyle} />
                  <InfoField label="Опыт преподавания" value={mentor.experience} />
                  <InfoField label="Специализация" value={mentor.specialization} />
                  <InfoField label="Доступность" value={mentor.availability} />
                </div>

                {/* Образование и сертификация */}
                <div className="mentor-section">
                  <h3>ОБРАЗОВАНИЕ И СЕРТИФИКАЦИЯ</h3>
                  <InfoField label="Образование" value={mentor.education} />
                  <InfoField label="Сертификация" value={mentor.certification} />
                  <InfoField label="Номер сертификата" value={mentor.certificateNumber} />
                  <InfoField label="Дата регистрации" value={mentor.registrationDate} />
                </div>

                {/* Контакты */}
                <div className="mentor-section">
                  <h3>КОНТАКТНАЯ ИНФОРМАЦИЯ</h3>
                  <InfoField label="Город" value={mentor.city} />
                  <InfoField label="Языки" value={mentor.languages?.join(', ')} />
                  <InfoField label="Способ связи" value="Через платформу YogaVibe" />
                </div>

                {/* Философия и подход */}
                <div className="mentor-section">
                  <h3>ФИЛОСОФИЯ И ПОДХОД</h3>
                  <div className="field-group full-width">
                    <div className="field-value philosophy-text">
                      {mentor.philosophy}
                    </div>
                  </div>
                </div>

                {/* Достижения */}
                <div className="mentor-section">
                  <h3>ДОСТИЖЕНИЯ</h3>
                  <div className="field-group full-width">
                    <div className="field-value achievements-text">
                      {mentor.achievements}
                    </div>
                  </div>
                </div>

                {/* Отзывы */}
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