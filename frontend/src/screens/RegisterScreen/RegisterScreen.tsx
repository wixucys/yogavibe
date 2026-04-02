import React, { JSX, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterScreen.css';
import logo from './flower.svg';
import eyeShow from './eye-show.svg';
import eyeHide from './eye-hide.svg';
import type { AuthActionResult, RegisterData } from '../../types/auth';

interface RegisterScreenProps {
  onRegister: (userData: RegisterData) => Promise<AuthActionResult>;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const RegisterScreen = ({ onRegister }: RegisterScreenProps): JSX.Element => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = (): void => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
      general: undefined,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};

    const username = formData.username.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!username) {
      newErrors.username = 'Введите имя пользователя';
    } else if (username.length < 3) {
      newErrors.username = 'Имя должно быть не менее 3 символов';
    } else if (!usernameRegex.test(username)) {
      newErrors.username = 'Имя может содержать только буквы, цифры и подчеркивания';
    }

    if (!email) {
      newErrors.email = 'Введите email';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Введите корректный email';
    }

    if (!password.trim()) {
      newErrors.password = 'Введите пароль';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const getRedirectPath = (user: { role?: string } | undefined): string => {
    if (!user) return '/main';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'mentor') return '/mentor/dashboard';
    return '/main';
  };

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (loading) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const userData: RegisterData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const result = await onRegister(userData);

      if (result.success) {
        navigate(getRedirectPath(result.user));
        return;
      }

      setErrors({
        general: result.message || 'Ошибка регистрации. Попробуйте еще раз.',
      });
    } catch (err) {
      console.error('Register error:', err);

      setErrors({
        general: 'Ошибка соединения с сервером',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToWelcome = (): void => {
    navigate('/');
  };

  return (
    <div className="register-screen">
      <div className="register-container">
        <div className="register-text">
          <p>Неважно, как медленно ты продвигаешься</p>
          <p>Главное — ты не останавливаешься</p>
          <p>И мы будем с тобой на каждом вдохе</p>
        </div>

        <form className="register-form" onSubmit={handleRegister} noValidate>
          <h3 className="entry">РЕГИСТРАЦИЯ</h3>

          <div className="flower-icon">
            <img src={logo} alt="Цветок" />
          </div>

          {errors.general && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠</span>
              {errors.general}
            </div>
          )}

          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder="логин (для входа)"
              className={`register-input ${errors.username ? 'input-error' : ''}`}
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              required
            />

            {errors.username && (
              <span className="field-error">{errors.username}</span>
            )}
          </div>

          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="email"
              className={`register-input ${errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />

            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          <div className="input-group password-group">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="пароль"
              className={`register-input password-input ${errors.password ? 'input-error' : ''}`}
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              disabled={loading}
            >
              <img
                src={showPassword ? eyeHide : eyeShow}
                alt=""
                className="password-icon"
              />
            </button>

            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          <div className="input-group password-group">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="подтвердите пароль"
              className={`register-input password-input ${errors.confirmPassword ? 'input-error' : ''}`}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={toggleConfirmPasswordVisibility}
              disabled={loading}
            >
              <img
                src={showConfirmPassword ? eyeHide : eyeShow}
                alt=""
                className="password-icon"
              />
            </button>

            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            className="register-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <div className="register-options">
            <Link to="/login" className="login-link">
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </form>
      </div>

      <div className="welcome-back-container">
        <button
          type="button"
          className="welcome-back-btn"
          onClick={goToWelcome}
        >
          ← Вернуться на главную
        </button>
      </div>
    </div>
  );
};

export default RegisterScreen;