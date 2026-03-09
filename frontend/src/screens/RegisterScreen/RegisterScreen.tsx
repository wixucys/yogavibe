import React, { JSX, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterScreen.css';
import logo from './flower.svg';
import eyeShow from './eye-show.svg';
import eyeHide from './eye-hide.svg';
import type { AuthActionResult, RegisterData } from '../../services/AuthService';

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
  const navigate = useNavigate();

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = (): void => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    const fieldName = name as keyof RegisterFormData;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!formData.username.trim()) {
      newErrors.username = 'Введите имя пользователя';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Имя должно быть не менее 3 символов';
    } else if (formData.username.length > 50) {
      newErrors.username = 'Имя должно быть не более 50 символов';
    } else if (!usernameRegex.test(formData.username)) {
      newErrors.username = 'Имя может содержать только буквы, цифры и подчеркивания';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Введите корректный email';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email должен быть не более 100 символов';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Введите пароль';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    } else if (formData.password.length > 100) {
      newErrors.password = 'Пароль должен быть не более 100 символов';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Подтвердите пароль';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

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
        navigate('/main');
      } else {
        setErrors({
          general: result.message || 'Ошибка регистрации. Попробуйте еще раз.',
        });
      }
    } catch (error: unknown) {
      console.error('RegisterScreen: Registration error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Ошибка при регистрации. Попробуйте еще раз.';

      setErrors({
        general: message,
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
            <img src={logo} alt="Цветок" loading="lazy" />
          </div>

          {errors.general && (
            <div className="error-message">
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
              minLength={3}
              maxLength={50}
              pattern="[a-zA-Z0-9_]+"
              title="Только буквы, цифры и подчеркивания"
              aria-label="Имя пользователя (логин)"
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
            />
            {errors.username && (
              <span className="field-error" id="username-error" role="alert">
                {errors.username}
              </span>
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
              maxLength={100}
              aria-label="Email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span className="field-error" id="email-error" role="alert">
                {errors.email}
              </span>
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
              minLength={6}
              maxLength={100}
              aria-label="Пароль"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              disabled={loading}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              aria-pressed={showPassword}
            >
              <img
                src={showPassword ? eyeHide : eyeShow}
                alt={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="password-icon"
              />
            </button>
            {errors.password && (
              <span className="field-error" id="password-error" role="alert">
                {errors.password}
              </span>
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
              minLength={6}
              maxLength={100}
              aria-label="Подтверждение пароля"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={toggleConfirmPasswordVisibility}
              disabled={loading}
              aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
              aria-pressed={showConfirmPassword}
            >
              <img
                src={showConfirmPassword ? eyeHide : eyeShow}
                alt={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="password-icon"
              />
            </button>
            {errors.confirmPassword && (
              <span className="field-error" id="confirm-password-error" role="alert">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button
            className="register-button"
            type="submit"
            disabled={loading}
            aria-busy={loading}
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
          aria-label="Вернуться на главную страницу"
        >
          ← Вернуться на главную
        </button>
      </div>
    </div>
  );
};

export default RegisterScreen;