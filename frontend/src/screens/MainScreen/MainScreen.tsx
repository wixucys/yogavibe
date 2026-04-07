import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
type SortBy = 'created_at' | 'price' | 'rating' | 'experience_years' | 'name';
type SortOrder = 'asc' | 'desc';

interface MentorListResponse {
  items: MentorApi[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    pages: number;
  };
}

interface FiltersState {
  search: string;
  gender: GenderFilter;
  city: string;
  yogaStyle: string;
  minPrice: string;
  maxPrice: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

interface MainScreenProps {
  user: User | null;
  onLogout: () => Promise<void> | void;
}

const NAV_PARAM_TO_ITEM: Record<string, NavItem> = {
  mentors: 'МЕНТОРЫ',
  bookings: 'МОИ ЗАПИСИ',
  notes: 'ЗАМЕТКИ',
  profile: 'МОЯ АНКЕТА',
};

const NAV_ITEM_TO_PARAM: Record<NavItem, string> = {
  МЕНТОРЫ: 'mentors',
  'МОИ ЗАПИСИ': 'bookings',
  ЗАМЕТКИ: 'notes',
  'МОЯ АНКЕТА': 'profile',
};

const VALID_SORT_BY: SortBy[] = [
  'created_at',
  'price',
  'rating',
  'experience_years',
  'name',
];

const VALID_SORT_ORDER: SortOrder[] = ['asc', 'desc'];

const parsePage = (rawPage: string | null): number => {
  if (!rawPage) return 1;

  const parsed = Number(rawPage);
  if (Number.isNaN(parsed) || parsed < 1) return 1;

  return Math.floor(parsed);
};

const parseActiveNav = (tabValue: string | null): NavItem => {
  if (!tabValue) return 'МЕНТОРЫ';
  return NAV_PARAM_TO_ITEM[tabValue] ?? 'МЕНТОРЫ';
};

const parseFilters = (searchParams: URLSearchParams): FiltersState => {
  const sortByRaw = searchParams.get('sortBy') as SortBy | null;
  const sortOrderRaw = searchParams.get('sortOrder') as SortOrder | null;
  const genderRaw = searchParams.get('gender') as GenderFilter | null;

  return {
    search: searchParams.get('search') ?? '',
    gender:
      genderRaw === 'female' || genderRaw === 'male' || genderRaw === 'all'
        ? genderRaw
        : 'all',
    city: searchParams.get('city') ?? 'all',
    yogaStyle: searchParams.get('yogaStyle') ?? 'all',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    sortBy: VALID_SORT_BY.includes(sortByRaw as SortBy)
      ? (sortByRaw as SortBy)
      : 'rating',
    sortOrder: VALID_SORT_ORDER.includes(sortOrderRaw as SortOrder)
      ? (sortOrderRaw as SortOrder)
      : 'desc',
  };
};

const MainScreen = ({ user, onLogout }: MainScreenProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialNav = parseActiveNav(searchParams.get('tab'));
  const initialFilters = parseFilters(searchParams);
  const initialPage = parsePage(searchParams.get('page'));

  const [activeNav, setActiveNav] = useState<NavItem>(initialNav);
  const [userInfo, setUserInfo] = useState<User | null>(null);

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [totalMentors, setTotalMentors] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [showNotifications, setShowNotifications] = useState(false);

  const [filters, setFilters] = useState<FiltersState>(initialFilters);

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
    const params = new URLSearchParams();

    params.set('tab', NAV_ITEM_TO_PARAM[activeNav]);

    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.gender !== 'all') params.set('gender', filters.gender);
    if (filters.city !== 'all') params.set('city', filters.city);
    if (filters.yogaStyle !== 'all') params.set('yogaStyle', filters.yogaStyle);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.sortBy !== 'rating') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
    if (page > 1) params.set('page', String(page));

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [activeNav, filters, page, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeNav !== 'МЕНТОРЫ') return;

    let cancelled = false;

    const fetchMentors = async (): Promise<void> => {
      setLoadingMentors(true);
      setMentorError(null);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
          sort_by: filters.sortBy,
          sort_order: filters.sortOrder,
        });

        if (filters.search.trim()) {
          queryParams.append('search', filters.search.trim());
        }

        if (filters.gender !== 'all') {
          queryParams.append('gender', filters.gender);
        }

        if (filters.city !== 'all') {
          queryParams.append('city', filters.city);
        }

        if (filters.yogaStyle !== 'all') {
          queryParams.append('yoga_style', filters.yogaStyle);
        }

        if (filters.minPrice) {
          queryParams.append('min_price', filters.minPrice);
        }

        if (filters.maxPrice) {
          queryParams.append('max_price', filters.maxPrice);
        }

        const response = await ApiService.request<MentorListResponse | MentorApi[]>(
          `/mentors?${queryParams.toString()}`,
          { method: 'GET' }
        );

        const apiMentors = Array.isArray(response) ? response : response.items;
        const normalizedMentors = apiMentors.map(mapMentorFromApi);

        const resolvedTotal = Array.isArray(response)
          ? normalizedMentors.length
          : response.meta.total;

        const resolvedPages = Array.isArray(response)
          ? Math.max(1, Math.ceil(normalizedMentors.length / PAGE_SIZE))
          : Math.max(1, response.meta.pages);

        if (!cancelled) {
          setMentors(normalizedMentors);
          setTotalMentors(resolvedTotal);
          setTotalPages(resolvedPages);

          if (page > resolvedPages) {
            setPage(resolvedPages);
          }
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setMentorError('Не удалось загрузить менторов');
          setMentors([]);
          setTotalMentors(0);
          setTotalPages(1);
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
  }, [activeNav, filters, page]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.gender,
    filters.city,
    filters.yogaStyle,
    filters.minPrice,
    filters.maxPrice,
    filters.sortBy,
    filters.sortOrder,
  ]);

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

  const handleFilterChange = (name: keyof FiltersState, value: string): void => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setFilters((prev) => ({ ...prev, [field]: cleaned }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      gender: 'all',
      city: 'all',
      yogaStyle: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'rating',
      sortOrder: 'desc',
    });
  };

  const changePage = (nextPage: number): void => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5
  );

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
              <label className="filter-label">Поиск</label>
              <input
                className="search-input"
                placeholder="Имя, стиль, город"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

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
              <div className="price-inputs">
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
            </div>

            <div className="filter-group">
              <label className="filter-label">Сортировка</label>
              <select
                className="filter-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="rating">По рейтингу</option>
                <option value="price">По цене</option>
                <option value="experience_years">По опыту</option>
                <option value="name">По имени</option>
                <option value="created_at">По дате добавления</option>
              </select>
              <button
                type="button"
                className="sort-order-btn"
                onClick={() =>
                  handleFilterChange(
                    'sortOrder',
                    filters.sortOrder === 'asc' ? 'desc' : 'asc'
                  )
                }
              >
                {filters.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
              </button>
            </div>

            <button className="clear-filters-btn" onClick={clearFilters}>
              Сбросить
            </button>

            <div className="results-info">
              <span className="results-count">Найдено: {totalMentors}</span>
            </div>

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
                {mentors.length === 0 && !mentorError ? (
                  <div className="no-results">
                    <p>По текущим фильтрам менторы не найдены</p>
                  </div>
                ) : null}

                {mentorError ? (
                  <div className="no-results">
                    <p>{mentorError}</p>
                  </div>
                ) : null}

                {mentors.map((mentor) => (
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

                    <Link
                      className="more-btn-link"
                      to={`/mentor/${mentor.id}`}
                      state={{ returnTo: `/main?${searchParams.toString()}` }}
                    >
                      <button type="button" className="more-btn">
                        ПОДРОБНЕЕ
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {!loadingMentors && totalPages > 1 && (
              <div className="main-footer">
                <div className="pagination">
                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => changePage(page - 1)}
                    disabled={page <= 1}
                  >
                    &lt;
                  </button>

                  {visiblePages.map((pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={`page-num ${pageNumber === page ? 'selected' : ''}`}
                      onClick={() => changePage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => changePage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    &gt;
                  </button>
                </div>
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