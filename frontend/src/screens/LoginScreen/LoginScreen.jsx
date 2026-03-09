import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginScreen.css';
import logo from './flower.svg';
import eyeShow from './eye-show.svg';
import eyeHide from './eye-hide.svg';

const LoginScreen = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.login.trim()) {
      setError('Введите логин или email');
      return false;
    }
    
    if (!formData.password.trim()) {
      setError('Введите пароль');
      return false;
    }
    
    return true;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credentials = {
        login: formData.login,
        password: formData.password
      };
      
      const result = await onLogin(credentials);
      
      if (result.success) {
        navigate('/main');
      } else {
        setError(result.message || 'Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка при входе. Попробуйте еще раз.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToWelcome = () => {
    navigate('/');
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-text">
          <p>Неважно, как медленно ты продвигаешься</p>
          <p>Главное — ты не останавливаешься</p>
          <p>И мы будем с тобой на каждом вдохе</p>
        </div>
        
        <form className="login-form" onSubmit={handleLogin} noValidate>
          <h3 className="entry">ВХОД В АККАУНТ</h3>
          
          <div className="flower-icon">
            <img src={logo} alt="Цветочек" />
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}
          
          <div className="input-group">
            <input 
              type="text" 
              name="login"
              placeholder="логин или email"
              className="login-input"
              value={formData.login}
              onChange={handleChange}
              disabled={loading}
              required
              aria-label="Логин или email"
              aria-invalid={!!error}
            />
          </div>
          
          <div className="input-group password-group">
            <input 
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="пароль"
              className="login-input password-input"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
              minLength="6"
              aria-label="Пароль"
              aria-invalid={!!error}
            />
            <button 
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              disabled={loading}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              tabIndex="0"
            >
              <img
                src={showPassword ? eyeHide : eyeShow} 
                alt={showPassword ? "Скрыть пароль" : "Показать пароль"}
                className="password-icon"
              />
            </button>
          </div>

          <button 
            className="login-button" 
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'ВХОД...' : 'Войти'}
          </button>
          
          <div className="login-options">
            <div className="options-left">
              <Link to="/register" className="register">
                Регистрация
              </Link>
            </div>
          </div>
        </form>
      </div>
      
      <div className="welcome-back-container">
        <button 
          type="button"
          className="welcome-back-btn"
          onClick={goToWelcome}
          aria-label="Вернуться на главную страницу"
        >
          ← Вернуться на главную
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;