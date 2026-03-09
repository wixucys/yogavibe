import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './MainScreen.css';
import NotesScreen from '../NotesScreen/NotesScreen';
import ProfileScreen from '../ProfileScreen/ProfileScreen';
import MyBookingsScreen from '../MyBookingsScreen/MyBookingsScreen';
import ApiService from '../../services/ApiService';
import AuthService from '../../services/AuthService';

// Константы для фильтров
const cities = [
  "Москва",
  "Санкт-Петербург", 
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Самара",
  "Омск",
  "Ростов-на-Дону",
  "Уфа",
  "Красноярск",
  "Воронеж",
  "Пермь",
  "Волгоград"
];

const yogaStyles = [
  "Хатха",
  "Аштанга",
  "Восстановительная",
  "Силовая",
  "Кундалини",
  "Йогатерапия",
  "Для начинающих",
  "Бикрам",
  "Интегральная",
  "Виньяса",
  "Айенгара",
  "Инь-йога"
];

const PAGE_SIZE = 3;

const MainScreen = ({ user, onLogout }) => {
  // Состояние для пагинации
  const [page, setPage] = useState(1);
  
  // Состояние для уведомлений
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Состояние для активной навигации
  const [activeNav, setActiveNav] = useState('МЕНТОРЫ');
  
  // Состояние для информации о пользователе
  const [userInfo, setUserInfo] = useState(null);
  
  // Состояние для менторов
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [mentorError, setMentorError] = useState(null);
  
  // Фильтры для менторов
  const [filters, setFilters] = useState({
    gender: 'all',
    city: 'all',
    yogaStyle: 'all',
    minPrice: '',
    maxPrice: ''
  });

  const notificationsRef = useRef(null);
  const navigate = useNavigate();

  // ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
  useEffect(() => {
    if (user) {
      setUserInfo(user);
    } else {
      // Если user не передан, проверяем localStorage
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
    const fetchMentors = async () => {
      if (activeNav !== 'МЕНТОРЫ') return;
      
      setLoadingMentors(true);
      setMentorError(null);
      
      try {
        console.log('Fetching mentors from API...');
        
        // Формируем параметры запроса для фильтрации
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
        
        const response = await ApiService.request(url, {
          method: 'GET'
        });
        
        console.log('Mentors received:', response);
        
        // Конвертируем snake_case в camelCase для фронтенда
        const formattedMentors = response.map(mentor => ({
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
          createdAt: mentor.created_at
        }));
        
        setMentors(formattedMentors);
      } catch (error) {
        console.error('Error fetching mentors:', error);
        setMentorError('Не удалось загрузить менторов. Попробуйте обновить страницу.');
        
        // Fallback на моковые данные если API недоступно
        const mockMentors = [
          { 
            id: 1, 
            name: "Анна Иванова", 
            description: "Опытный инструктор по хатха йоге с 5-летним стажем", 
            gender: "female", 
            city: "Москва", 
            price: 2500, 
            yogaStyle: "Хатха", 
            photoUrl: null,
            isAvailable: true 
          },
          { 
            id: 2, 
            name: "Дмитрий Петров", 
            description: "Специалист по аштанга йоге и медитации", 
            gender: "male", 
            city: "Санкт-Петербург", 
            price: 3000, 
            yogaStyle: "Аштанга", 
            photoUrl: null,
            isAvailable: true 
          },
        ];
        setMentors(mockMentors);
      } finally {
        setLoadingMentors(false);
      }
    };
    
    fetchMentors();
  }, [activeNav, filters.city, filters.yogaStyle]); // Добавляем зависимости для фильтров

  // ФИЛЬТРАЦИЯ МЕНТОРОВ (теперь фильтруем на фронтенде то, что пришло с бэкенда)
  const filteredMentors = mentors.filter(mentor => {
    // Фильтрация по полу (делаем на фронтенде)
    if (filters.gender !== 'all' && mentor.gender !== filters.gender) return false;
    
    // Фильтрация по цене (делаем на фронтенде)
    const minPrice = filters.minPrice ? parseInt(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice) : null;
    
    if (minPrice !== null) {
      if (isNaN(minPrice) || minPrice < 0) return false;
      if (mentor.price < minPrice) return false;
    }
    
    if (maxPrice !== null) {
      if (isNaN(maxPrice) || maxPrice < 0) return false;
      if (mentor.price > maxPrice) return false;
    }
    
    if (minPrice !== null && maxPrice !== null) {
      if (minPrice > maxPrice) return false;
    }
    
    // Фильтрация по доступности
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
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // ОБРАБОТЧИКИ НАВИГАЦИИ И ФИЛЬТРОВ
  const handleNavClick = (navItem, event) => {
    event.preventDefault();
    setActiveNav(navItem);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Обработчик изменения ценовых полей с валидацией
  const handlePriceChange = (field, value) => {
    const numericValue = value === '' ? '' : value.replace(/[^0-9]/g, '');
    
    if (numericValue !== '' && parseInt(numericValue) < 0) {
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const clearFilters = () => {
    setFilters({
      gender: 'all',
      city: 'all',
      yogaStyle: 'all',
      minPrice: '',
      maxPrice: ''
    });
  };

  // Выход из аккаунта
  const handleLogoutClick = () => {
    if (window.confirm('Вы уверены, что хотите выйти из аккаунта?')) {
      onLogout();
      navigate('/login');
    }
  };

  // РЕНДЕРИНГ
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
        
        {/* Выпадающее меню уведомлений */}
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
      
      {/* Контент страницы в зависимости от активной навигации */}
      {activeNav === 'МЕНТОРЫ' && (
        <div className="mentors-page">
          {/* Фильтры слева */}
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
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
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
                {yogaStyles.map(style => (
                  <option key={style} value={style}>{style}</option>
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
                  min="0"
                  onKeyDown={(e) => {
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
                  min="0"
                  onKeyDown={(e) => {
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

            {/* Кнопка выхода из аккаунта */}
            <div className="sidebar-footer">
              <button 
                className="logout-btn" 
                onClick={handleLogoutClick} 
                aria-label="Выйти из аккаунта"
              >
                <span className="logout-icon">↩</span>
                Выйти из аккаунта
              </button>
            </div>
          </aside>

          {/* Основной контент с менторами */}
          <main className="mentors-main">
            {loadingMentors ? (
              <div className="loading-screen" style={{ width: '100%', height: '400px' }}>
                <div className="loading-spinner"></div>
                <p>Загрузка менторов...</p>
              </div>
            ) : mentorError ? (
              <div className="error-message" style={{ background: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '0.5rem', margin: '1rem' }}>
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
                              <div style={{ marginTop: '10px' }}>{mentor.name.split(' ')[0]}</div>
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
                          <button className="more-btn">
                            ПОДРОБНЕЕ
                          </button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <p>По вашему запросу менторов не найдено</p>
                      <button 
                        onClick={clearFilters} 
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#69505c', color: 'white', border: 'none', borderRadius: '0.5rem' }}
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
                        onClick={() => setPage(page - 1)}
                        aria-label="Предыдущая страница"
                      >
                        &lt;
                      </button>
                      <span>
                        {Array.from({length: totalPages}, (_, i) => (
                          <button
                            key={i}
                            className={`page-num${page === i+1 ? " selected" : ""}`}
                            onClick={() => setPage(i + 1)}
                            aria-label={`Страница ${i + 1}`}
                            aria-current={page === i+1 ? "page" : undefined}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </span>
                      <button 
                        className="page-btn" 
                        disabled={page === totalPages} 
                        onClick={() => setPage(page + 1)}
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
      
      {activeNav === 'МОИ ЗАПИСИ' && (
        <MyBookingsScreen />
      )}
      
      {activeNav === 'ЗАМЕТКИ' && (
        <NotesScreen />
      )}
      
      {activeNav === 'МОЯ АНКЕТА' && (
        <ProfileScreen 
          user={userInfo}
        />
      )}
    </div>
  );
};

export default MainScreen;