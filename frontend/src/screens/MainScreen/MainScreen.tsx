import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './MainScreen.css';
import NotesScreen from '../NotesScreen/NotesScreen';
import ProfileScreen from '../ProfileScreen/ProfileScreen';
import MyBookingsScreen from '../MyBookingsScreen/MyBookingsScreen';
import ApiService, { type User } from '../../services/ApiService';
import AuthService from '../../services/AuthService';

// Константы для фильтров
const cities: string[] = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
  'Уфа',
  'Красноярск',
  'Воронеж',
  'Пермь',
  'Волгоград',
];

const yogaStyles: string[] = [
  'Хатха',
  'Аштанга',
  'Восстановительная',
  'Силовая',
  'Кундалини',
  'Йогатерапия',
  'Для начинающих',
  'Бикрам',
  'Интегральная',
  'Виньяса',
  'Айенгара',
  'Инь-йога',
];

const PAGE_SIZE = 3;

type NavItem = 'МЕНТОРЫ' | 'МОИ ЗАПИСИ' | 'ЗАМЕТКИ' | 'МОЯ АНКЕТА';
type GenderFilter = 'all' | 'female' | 'male';

interface MainScreenProps {
  user: User | null;
  onLogout: () => Promise<void> | void;
}

interface MentorApiItem {
  id: string | number;
  name: string;
  description: string;
  gender: 'female' | 'male' | string;
  city: string;
  price: number;
  yoga_style: string;
  rating?: number;
  experience_years?: number;
  photo_url?: string | null;
  is_available?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

interface Mentor {
  id: string | number;
  name: string;
  description: string;
  gender: string;
  city: string;
  price: number;
  yogaStyle: string;
  rating?: number;
  experienceYears?: number;
  photoUrl?: string | null;
  isAvailable: boolean;
  createdAt?: string;
}

interface FiltersState {
  gender: GenderFilter;
  city: string;
  yogaStyle: string;
  minPrice: string;
  maxPrice: string;
}

const MainScreen = ({ user, onLogout }: MainScreenProps): JSX.Element => {
  const [page, setPage] = useState<number>(1);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<NavItem>('МЕНТОРЫ');
  const [userInfo, setUserInfo] = useState<User | null>(null);

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState<boolean>(false);
  const [mentorError, setMentorError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>({
    gender: 'all',
    city: 'all',
    yogaStyle: 'all',
    minPrice: '',
    maxPrice: '',
  });

  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
  useEffect(() => {
    if (user) {
      setUserInfo(user);
    } else {
      const storedUser = AuthService.getCurrentUser();

      if (storedUser) {
        setUserInfo(storedUser);
      } else {
        navigate('/login');
      }
    }
  }, [user, navigate]);

  // ЗАГРУЗКА МЕНТОРОВ ИЗ API
  useEffect(() => {
    const fetchMentors = async (): Promise<void> => {
      if (activeNav !== 'МЕНТОРЫ') return;

      setLoadingMentors(true);
      setMentorError(null);

      try {
        console.log('Fetching mentors from API...');

        const queryParams = new URLSearchParams();

        if (filters.city !== 'all') {
          queryParams.append('city', filters.city);
        }

        if (filters.yogaStyle !== 'all') {
          queryParams.append('yoga_style', filters.yogaStyle);
        }

        const url = queryParams.toString()
          ? `/mentors?${queryParams.toString()}`
          : '/mentors';

        console.log('Fetching mentors from:', url);

        const response = await ApiService.request<MentorApiItem[]>(url, {
          method: 'GET',
        });

        console.log('Mentors received:', response);

        const formattedMentors: Mentor[] = response.map((mentor) => ({
          id: mentor.id,
          name: mentor.name,
          description: mentor.description,
          gender: mentor.gender,
          city: mentor.city,
          price: mentor.price,
          yogaStyle: mentor.yoga_style,
          rating: mentor.rating,
          experienceYears: mentor.experience_years,
          photoUrl: mentor.photo_url ?? null,
          isAvailable: mentor.is_available ?? false,
          createdAt: mentor.created_at,
        }));

        setMentors(formattedMentors);
      } catch (error) {
        console.error('Error fetching mentors:', error);
        setMentorError('Не удалось загрузить менторов. Попробуйте обновить страницу.');

        const mockMentors: Mentor[] = [
          {
            id: 1,
            name: 'Анна Иванова',
            description: 'Опытный инструктор по хатха йоге с 5-летним стажем',
            gender: 'female',
            city: 'Москва',
            price: 2500,
            yogaStyle: 'Хатха',
            photoUrl: null,
            isAvailable: true,
          },
          {
            id: 2,
            name: 'Дмитрий Петров',
            description: 'Специалист по аштанга йоге и медитации',
            gender: 'male',
            city: 'Санкт-Петербург',
            price: 3000,
            yogaStyle: 'Аштанга',
            photoUrl: null,
            isAvailable: true,
          },
        ];

        setMentors(mockMentors);
      } finally {
        setLoadingMentors(false);
      }
    };

    void fetchMentors();
  }, [activeNav, filters.city, filters.yogaStyle]);

  // ФИЛЬТРАЦИЯ МЕНТОРОВ
  const filteredMentors = mentors.filter((mentor) => {
    if (filters.gender !== 'all' && mentor.gender !== filters.gender) return false;

    const minPrice = filters.minPrice ? parseInt(filters.minPrice, 10) : null;
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice, 10) : null;

    if (minPrice !== null) {
      if (Number.isNaN(minPrice) || minPrice < 0) return false;
      if (mentor.price < minPrice) return false;
    }

    if (maxPrice !== null) {
      if (Number.isNaN(maxPrice) || maxPrice < 0) return false;
      if (mentor.price > maxPrice) return false;
    }

    if (minPrice !== null && maxPrice !== null) {
      if (minPrice > maxPrice) return false;
    }

    return mentor.isAvailable;
  });

  const total = filteredMentors.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentMentors = filteredMentors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Сброс пагинации при изменении фильтров
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ОБРАБОТЧИКИ УВЕДОМЛЕНИЙ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const targetNode = event.target as Node | null;

      if (
        notificationsRef.current &&
        targetNode &&
        !notificationsRef.current.contains(targetNode)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleNotifications = (): void => {
    setShowNotifications((prev) => !prev);
  };

  // ОБРАБОТЧИКИ НАВИГАЦИИ И ФИЛЬТРОВ
  const handleNavClick = (
    navItem: NavItem,
    event: React.MouseEvent<HTMLAnchorElement>
  ): void => {
    event.preventDefault();
    setActiveNav(navItem);
  };

  const handleFilterChange = (
    filterName: keyof FiltersState,
    value: string
  ): void => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handlePriceChange = (
    field: 'minPrice' | 'maxPrice',
    value: string
  ): void => {
    const numericValue = value === '' ? '' : value.replace(/[^0-9]/g, '');

    if (numericValue !== '' && parseInt(numericValue, 10) < 0) {
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [field]: numericValue,
    }));
  };

  const clearFilters = (): void => {
    setFilters({
      gender: 'all',
      city: 'all',
      yogaStyle: 'all',
      minPrice: '',
      maxPrice: '',
    });
  };

  // Выход из аккаунта
  const handleLogoutClick = async (): Promise<void> => {
    if (window.confirm('Вы уверены, что хотите выйти из аккаунта?')) {
      await onLogout();
      navigate('/login');
    }
  };

  if (!userInfo) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className={`main-bg ${showNotifications ? 'dimmed' : ''}`}>
      <header className="main-header">
        <span className="logo">yogavibe</span>

        <nav className="main-nav">
          <a
            href="#"
            className={`main-nav-link ${activeNav === 'МЕНТОРЫ' ? 'active' : ''}`}
            onClick={(e) => handleNavClick('МЕНТОРЫ', e)}
          >
            МЕНТОРЫ
          </a>
          <a
            href="#"
            className={`main-nav-link ${activeNav === 'МОИ ЗАПИСИ' ? 'active' : ''}`}
            onClick={(e) => handleNavClick('МОИ ЗАПИСИ', e)}
          >
            МОИ ЗАПИСИ
          </a>
          <a
            href="#"
            className={`main-nav-link ${activeNav === 'ЗАМЕТКИ' ? 'active' : ''}`}
            onClick={(e) => handleNavClick('ЗАМЕТКИ', e)}
          >
            ЗАМЕТКИ
          </a>
          <a
            href="#"
            className={`main-nav-link ${activeNav === 'МОЯ АНКЕТА' ? 'active' : ''}`}
            onClick={(e) => handleNavClick('МОЯ АНКЕТА', e)}
          >
            МОЯ АНКЕТА
          </a>
        </nav>

        <div
          className="mail-btn"
          onClick={toggleNotifications}
          title="Уведомления"
          aria-label="Открыть уведомления"
        />

        {showNotifications && (
          <div className="notifications-dropdown" ref={notificationsRef}>
            <div className="notifications-header">
              <h3>Уведомления</h3>
            </div>

            <div className="notifications-list">
              <div className="notification-item">
                <div className="notification-content">
                  <p>Уведомлений пока нет</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {activeNav === 'МЕНТОРЫ' && (
        <div className="mentors-page">
          <aside className="filters-sidebar">
            <div className="filters-header">
              <h3>Фильтры</h3>
            </div>

            <div className="filter-group">
              <label className="filter-label">Пол</label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="filter-select"
                aria-label="Фильтр по полу"
              >
                <option value="all">Любой</option>
                <option value="female">Женский</option>
                <option value="male">Мужской</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Город</label>
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="filter-select"
                aria-label="Фильтр по городу"
              >
                <option value="all">Любой город</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Стиль йоги</label>
              <select
                value={filters.yogaStyle}
                onChange={(e) => handleFilterChange('yogaStyle', e.target.value)}
                className="filter-select"
                aria-label="Фильтр по стилю йоги"
              >
                <option value="all">Любой стиль</option>
                {yogaStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Цена за сессию</label>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="От"
                  value={filters.minPrice}
                  onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                  className="price-input"
                  aria-label="Минимальная цена"
                  min={0}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                />
                <input
                  type="number"
                  placeholder="До"
                  value={filters.maxPrice}
                  onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                  className="price-input"
                  aria-label="Максимальная цена"
                  min={0}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>

            <div className="results-info">
              <div className="results-count">
                Найдено: <strong>{filteredMentors.length}</strong> менторов
              </div>
            </div>

            <button
              className="clear-filters-btn"
              onClick={clearFilters}
              aria-label="Сбросить фильтры"
            >
              Сбросить
            </button>

            <div className="sidebar-footer">
              <button
                className="logout-btn"
                onClick={() => {
                  void handleLogoutClick();
                }}
                aria-label="Выйти из аккаунта"
              >
                <span className="logout-icon">↩</span>
                Выйти из аккаунта
              </button>
            </div>
          </aside>

          <main className="mentors-main">
            {loadingMentors ? (
              <div className="loading-screen" style={{ width: '100%', height: '400px' }}>
                <div className="loading-spinner"></div>
                <p>Загрузка менторов...</p>
              </div>
            ) : mentorError ? (
              <div
                className="error-message"
                style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  margin: '1rem',
                }}
              >
                <p>{mentorError}</p>
              </div>
            ) : (
              <>
                <div className="mentors-area">
                  {currentMentors.length > 0 ? (
                    currentMentors.map((mentor) => (
                      <div className="mentor-card" key={mentor.id}>
                        <div className="mentor-img">
                          {mentor.photoUrl ? (
                            <img
                              src={mentor.photoUrl}
                              alt={`Фото ментора ${mentor.name}`}
                              loading="lazy"
                            />
                          ) : (
                            <div className="mentor-placeholder">
                              {mentor.gender === 'female' ? '👩' : '👨'}
                              <div style={{ marginTop: '10px' }}>
                                {mentor.name.split(' ')[0]}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mentor-info">
                          <div className="mentor-name">{mentor.name}</div>
                          <div className="mentor-details">
                            <span className="mentor-city">{mentor.city}</span>
                            <span className="mentor-price">{mentor.price} ₽/сессия</span>
                          </div>
                          <div className="mentor-yoga-style">
                            <span className="yoga-style-tag">{mentor.yogaStyle}</span>
                          </div>
                        </div>

                        <div className="mentor-text">
                          <b>{mentor.description}</b>
                        </div>

                        <Link
                          to={`/mentor/${mentor.id}`}
                          className="more-btn-link"
                          aria-label={`Подробнее о менторе ${mentor.name}`}
                        >
                          <button className="more-btn">ПОДРОБНЕЕ</button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <p>По вашему запросу менторов не найдено</p>
                      <button
                        onClick={clearFilters}
                        style={{
                          marginTop: '1rem',
                          padding: '0.5rem 1rem',
                          background: '#69505c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                        }}
                      >
                        Сбросить фильтры
                      </button>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <footer className="main-footer">
                    <div className="pagination">
                      <button
                        className="page-btn"
                        disabled={page === 1}
                        onClick={() => setPage((prev) => prev - 1)}
                        aria-label="Предыдущая страница"
                      >
                        &lt;
                      </button>

                      <span>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <button
                            key={i}
                            className={`page-num${page === i + 1 ? ' selected' : ''}`}
                            onClick={() => setPage(i + 1)}
                            aria-label={`Страница ${i + 1}`}
                            aria-current={page === i + 1 ? 'page' : undefined}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </span>

                      <button
                        className="page-btn"
                        disabled={page === totalPages}
                        onClick={() => setPage((prev) => prev + 1)}
                        aria-label="Следующая страница"
                      >
                        &gt;
                      </button>
                    </div>
                  </footer>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {activeNav === 'МОИ ЗАПИСИ' && <MyBookingsScreen />}

      {activeNav === 'ЗАМЕТКИ' && <NotesScreen />}

      {activeNav === 'МОЯ АНКЕТА' && <ProfileScreen user={userInfo} />}
    </div>
  );
};

export default MainScreen;