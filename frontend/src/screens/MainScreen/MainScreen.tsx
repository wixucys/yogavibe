import React, { JSX, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MainScreen.css';

import NotesScreen from '../NotesScreen/NotesScreen';
import ProfileScreen from '../ProfileScreen/ProfileScreen';
import MyBookingsScreen from '../MyBookingsScreen/MyBookingsScreen';

import ApiService from '../../services/ApiService';
import AuthService from '../../services/AuthService';

import type { User } from '../../types/user';
import type { Mentor, MentorApi } from '../../types/mentor';
import { mapMentorFromApi } from '../../types/mentor';

import { CITIES, YOGA_STYLES } from '../../constants/filters';

const PAGE_SIZE = 3;

type NavItem = 'МЕНТОРЫ' | 'МОИ ЗАПИСИ' | 'ЗАМЕТКИ' | 'МОЯ АНКЕТА';
type GenderFilter = 'all' | 'female' | 'male';

interface FiltersState {
  gender: GenderFilter;
  city: string;
  yogaStyle: string;
  minPrice: string;
  maxPrice: string;
}

interface MainScreenProps {
  user: User | null;
  onLogout: () => Promise<void> | void;
}

const MainScreen = ({ user, onLogout }: MainScreenProps): JSX.Element => {
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState<NavItem>('МЕНТОРЫ');
  const [userInfo, setUserInfo] = useState<User | null>(null);

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [showNotifications, setShowNotifications] = useState(false);

  const [filters, setFilters] = useState<FiltersState>({
    gender: 'all',
    city: 'all',
    yogaStyle: 'all',
    minPrice: '',
    maxPrice: '',
  });

  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      setUserInfo(user);
      return;
    }

    const storedUser = AuthService.getCurrentUser();

    if (storedUser) {
      setUserInfo(storedUser);
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeNav !== 'МЕНТОРЫ') return;

    let cancelled = false;

    const fetchMentors = async (): Promise<void> => {
      setLoadingMentors(true);
      setMentorError(null);

      try {
        const queryParams = new URLSearchParams();

        if (filters.city !== 'all') {
          queryParams.append('city', filters.city);
        }

        if (filters.yogaStyle !== 'all') {
          queryParams.append('yoga_style', filters.yogaStyle);
        }

        const url = queryParams.toString()
          ? `/mentors?${queryParams}`
          : '/mentors';

        const data = await ApiService.request<MentorApi[]>(url, { method: 'GET' });
        const normalizedMentors = data.map(mapMentorFromApi);

        if (!cancelled) {
          setMentors(normalizedMentors);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setMentorError('Не удалось загрузить менторов');
          setMentors([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingMentors(false);
        }
      }
    };

    fetchMentors();

    return () => {
      cancelled = true;
    };
  }, [activeNav, filters.city, filters.yogaStyle]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredMentors = useMemo(() => {
    const min = filters.minPrice ? parseInt(filters.minPrice) : null;
    const max = filters.maxPrice ? parseInt(filters.maxPrice) : null;

    if (min !== null && max !== null && min > max) return [];

    return mentors.filter((mentor) => {
      if (filters.gender !== 'all' && mentor.gender !== filters.gender)
        return false;

      if (min !== null && mentor.price < min) return false;

      if (max !== null && mentor.price > max) return false;

      return mentor.isAvailable !== false;
    });
  }, [mentors, filters]);

  const totalPages = Math.ceil(filteredMentors.length / PAGE_SIZE);

  const currentMentors = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMentors.slice(start, start + PAGE_SIZE);
  }, [filteredMentors, page]);

  const handleFilterChange = (name: keyof FiltersState, value: string): void => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setFilters((prev) => ({ ...prev, [field]: cleaned }));
  };

  const clearFilters = () => {
    setFilters({
      gender: 'all',
      city: 'all',
      yogaStyle: 'all',
      minPrice: '',
      maxPrice: '',
    });
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleLogoutClick = async () => {
    if (!window.confirm('Вы уверены, что хотите выйти?')) return;

    try {
      await onLogout();
    } catch (error) {
      console.error(error);
    }

    navigate('/login');
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
          {(['МЕНТОРЫ', 'МОИ ЗАПИСИ', 'ЗАМЕТКИ', 'МОЯ АНКЕТА'] as NavItem[]).map(
            (item) => (
              <a
                key={item}
                href="#"
                className={`main-nav-link ${
                  activeNav === item ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav(item);
                }}
              >
                {item}
              </a>
            )
          )}
          {userInfo.role === 'mentor' && (
            <Link className="main-nav-link" to="/mentor/dashboard">
              ПАНЕЛЬ МЕНТОРА
            </Link>
          )}
          {userInfo.role === 'admin' && (
            <Link className="main-nav-link" to="/admin/dashboard">
              ПАНЕЛЬ АДМИНИСТРАТОРА
            </Link>
          )}
        </nav>

        <button className="mail-btn" onClick={toggleNotifications} />

        {showNotifications && (
          <div className="notifications-dropdown" ref={notificationsRef}>
            <div className="notifications-header">
              <h3>Уведомления</h3>
            </div>
            <div className="notifications-list">
              <div className="notification-item">
                <p>Уведомлений пока нет</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {activeNav === 'МЕНТОРЫ' && (
        <div className="mentors-page">
          {/* sidebar */}
          <aside className="filters-sidebar">

            <div className="filter-group">
              <label className="filter-label">Пол</label>
              <select
                className="filter-select"
                value={filters.gender}
                onChange={(e) =>
                  handleFilterChange('gender', e.target.value)
                }
              >
                <option value="all">Любой</option>
                <option value="female">Женский</option>
                <option value="male">Мужской</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Город</label>
              <select
                className="filter-select"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
              >
                <option value="all">Любой</option>
                {CITIES.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Стиль йоги</label>
              <select
                className="filter-select"
                value={filters.yogaStyle}
                onChange={(e) =>
                  handleFilterChange('yogaStyle', e.target.value)
                }
              >
                <option value="all">Любой</option>
                {YOGA_STYLES.map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Цена</label>
              <input
                className="price-input"
                placeholder="От"
                value={filters.minPrice}
                onChange={(e) =>
                  handlePriceChange('minPrice', e.target.value)
                }
              />
              <input
                className="price-input"
                placeholder="До"
                value={filters.maxPrice}
                onChange={(e) =>
                  handlePriceChange('maxPrice', e.target.value)
                }
              />
            </div>

            <button className="clear-filters-btn" onClick={clearFilters}>
              Сбросить
            </button>

            <button className="logout-btn" onClick={handleLogoutClick}>
              Выйти
            </button>

          </aside>

          {/* mentors */}
          <main className="mentors-main">

            {loadingMentors ? (
              <div className="loading-screen">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <div className="mentors-area">
                {currentMentors.map((mentor) => (
                  <div className="mentor-card" key={mentor.id}>
                    <div className="mentor-img">
                      {mentor.photoUrl ? (
                        <img
                          src={mentor.photoUrl}
                          alt={`Фото ${mentor.name}`}
                        />
                      ) : (
                        <div className="mentor-img-placeholder">
                          Нет фото
                        </div>
                      )}
                    </div>

                    <div className="mentor-info">
                      <div className="mentor-name">{mentor.name}</div>

                      <div className="mentor-details">
                        <span className="mentor-city">{mentor.city}</span>
                        <span className="mentor-price">{mentor.price} ₽</span>
                      </div>

                      {mentor.description && (
                        <div className="mentor-text">{mentor.description}</div>
                      )}
                    </div>

                    <Link className="more-btn-link" to={`/mentor/${mentor.id}`}>
                      <button type="button" className="more-btn">
                        ПОДРОБНЕЕ
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
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