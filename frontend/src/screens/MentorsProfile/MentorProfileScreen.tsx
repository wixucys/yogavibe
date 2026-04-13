import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ApiService from '../../services/ApiService';
import './MentorProfileScreen.css';
import type { MentorApi, MentorProfile } from '../../types/mentor';
import { mapMentorToProfile } from '../../types/mentor';
import { ROUTES } from '../../constants/routes';
import { useSeo } from '../../hooks/useSeo';

interface MentorProfileLocationState {
  returnTo?: string;
}

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

const MentorProfileScreen = () => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as MentorProfileLocationState | null) ?? null;

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mentorJsonLd = useMemo(() => {
    if (!mentor) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: mentor.name,
      description: mentor.description || undefined,
      image: mentor.photoUrl || undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: mentor.city,
        addressCountry: 'RU',
      },
      hasOccupation: {
        '@type': 'Occupation',
        name: 'Инструктор по йоге',
        description: mentor.yogaStyle || undefined,
      },
      makesOffer: {
        '@type': 'Offer',
        name: `Индивидуальные занятия йогой — ${mentor.yogaStyle || 'персональная практика'}`,
        price: String(mentor.price),
        priceCurrency: 'RUB',
        availability: mentor.isAvailable
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    };
  }, [mentor]);

  useSeo({
    title: mentor ? `${mentor.name} - профиль ментора` : 'Профиль ментора',
    description:
      'Профиль ментора в YogaVibe: стиль практики, опыт, стоимость и доступность для бронирования.',
    canonicalPath: mentorId ? ROUTES.mentor.profile(mentorId) : ROUTES.user.main,
    noindex: true,
    ogType: 'profile',
  });

  useEffect(() => {
    if (!mentorId) {
      setError('Некорректный ID ментора');
      setLoading(false);
      return;
    }

    const loadMentorData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const response = await ApiService.request<MentorApi>(
          `/mentors/${mentorId}`,
          { method: 'GET' }
        );

        if (!response) {
          setError('Ментор не найден');
          return;
        }

        setMentor(mapMentorToProfile(response));
      } catch (err) {
        console.error(err);
        const statusCode =
          typeof err === 'object' && err !== null && 'status' in err
            ? Number((err as { status?: number }).status)
            : undefined;

        if (statusCode === 404) {
          setError('Профиль ментора не найден (404)');
        } else if (statusCode === 403) {
          setError('Доступ к профилю ограничен (403)');
        } else if (statusCode === 410) {
          setError('Профиль больше недоступен (410)');
        } else {
          setError('Не удалось загрузить профиль ментора');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadMentorData();
  }, [mentorId]);

  const handleBackClick = (): void => {
    navigate(locationState?.returnTo ?? ROUTES.user.main);
  };

  const handleBookSession = (): void => {
    if (!mentor || mentor.isAvailable === false) return;

    navigate(ROUTES.booking.create(mentor.id), { state: { mentor } });
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
    <main className="mentor-profile-page">
      <div className="mentor-profile-content">
        <article className="mentor-profile-card">
          <header className="mentor-profile-header">
            <button onClick={handleBackClick} className="back-btn">
              ← Назад
            </button>
            <h1>Профиль ментора</h1>
          </header>

          {mentorJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(mentorJsonLd) }}
            />
          )}

          <div className="mentor-profile-layout">
            <section className="mentor-profile-left" aria-labelledby="mentor-name-title">
              <figure className="mentor-photo-section">
                {mentor.photoUrl ? (
                  <img
                    src={mentor.photoUrl}
                    alt={`Фото ментора ${mentor.name}`}
                    loading="lazy"
                    decoding="async"
                    width={160}
                    height={160}
                  />
                ) : (
                  <div className="mentor-photo-text">
                    {mentor.gender === 'female' ? '👩' : '👨'}
                  </div>
                )}
              </figure>

              <h2 id="mentor-name-title">{mentor.name}</h2>

              <div>⭐ {mentor.rating ?? '—'}</div>
              <div>{mentor.city}</div>
              <div>{mentor.price} ₽</div>

              <button
                onClick={handleBookSession}
                className="book-btn-large"
                disabled={mentor.isAvailable === false}
              >
                {mentor.isAvailable === false ? 'НЕДОСТУПЕН' : 'ЗАПИСАТЬСЯ'}
              </button>
            </section>

            <section className="mentor-profile-right">
              <section className="mentor-section" aria-label="Основная информация о менторе">
                <h3>О МЕНТОРЕ</h3>
                <InfoField label="Стиль йоги" value={mentor.yogaStyle} />
                <InfoField label="Опыт" value={mentor.experience} />
                <InfoField label="Дата регистрации" value={mentor.registrationDate} />
              </section>

              {mentor.description && (
                <section className="mentor-section" aria-label="Описание ментора">
                  <h3>Описание</h3>
                  <p>{mentor.description}</p>
                </section>
              )}
            </section>
          </div>
        </article>
      </div>
    </main>
  );
};

export default MentorProfileScreen;
