import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginScreen.css';
import logo from './flower.svg';
import eyeShow from './eye-show.svg';
import eyeHide from './eye-hide.svg';
import { ROUTES } from '../../constants/routes';
import { useSeo } from '../../hooks/useSeo';

interface LoginFormData {
  login: string;
  password: string;
}

const LoginScreen = ()=> {
  const navigate = useNavigate();
  const { login } = useAuth();

  useSeo({
    title: 'Вход в аккаунт',
    description: 'Войдите в YogaVibe, чтобы выбрать ментора по йоге и управлять своими записями.',
    canonicalPath: ROUTES.auth.login,
    noindex: true,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState<LoginFormData>({
    login: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev) => !prev);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError('');
    }
  };

  const validateForm = (): boolean => {
    const loginValue = formData.login.trim();
    const password = formData.password.trim();

    if (!loginValue) {
      setError('Введите логин или email');
      return false;
    }

    if (!password) {
      setError('Введите пароль');
      return false;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }

    return true;
  };

  const getRedirectPath = (userRole?: string): string => {
    if (userRole === 'admin') return '/admin/dashboard';
    if (userRole === 'mentor') return '/mentor/dashboard';
    return ROUTES.user.main;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (loading) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credentials = {
        login: formData.login.trim().toLowerCase(),
        password: formData.password,
      };

      await login(credentials);
      const savedUserRaw = localStorage.getItem('yogavibe_user');
      const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;

      navigate(getRedirectPath(savedUser?.role));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ошибка при входе. Попробуйте позже.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const goToWelcome = (): void => {
    navigate(ROUTES.home);
  };

  return (
    <main className="login-screen">
      <section className="login-container" aria-labelledby="login-title">
        <aside className="login-text">
          <p>Неважно, как медленно ты продвигаешься</p>
          <p>Главное — ты не останавливаешься</p>
          <p>И мы будем с тобой на каждом вдохе</p>
        </aside>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h1 id="login-title" className="entry">Вход в аккаунт</h1>

          <div className="flower-icon">
            <img src={logo} alt="Логотип YogaVibe" />
          </div>

          {error && (
            <div className="error-message" role="alert">
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
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="input-group password-group">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="пароль"
              className="login-input password-input"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
              minLength={6}
              aria-label="Пароль"
              aria-invalid={Boolean(error)}
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
                alt=""
                className="password-icon"
                aria-hidden="true"
              />
            </button>
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <div className="login-options">
            <div className="options-left">
              <Link to={ROUTES.auth.register} className="register">
                Регистрация
              </Link>
            </div>
          </div>
        </form>
      </section>

      <div className="welcome-back-container">
        <button
          type="button"
          className="welcome-back-btn"
          onClick={goToWelcome}
        >
          ← Вернуться на главную
        </button>
      </div>
    </main>
  );
};

export default LoginScreen;

