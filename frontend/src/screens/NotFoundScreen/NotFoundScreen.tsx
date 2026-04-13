import React from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../hooks/useSeo';
import { ROUTES } from '../../constants/routes';
import './NotFoundScreen.css';

const NotFoundScreen = (): JSX.Element => {
  useSeo({
    title: 'Страница не найдена',
    description: 'Запрошенная страница не существует. Вернитесь на главную страницу YogaVibe.',
    canonicalPath: ROUTES.system.notFound,
    noindex: true,
  });

  return (
    <main className="not-found-screen" aria-labelledby="not-found-title">
      <section className="not-found-card">
        <p className="not-found-code" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title">Страница не найдена</h1>
        <p>
          Проверьте адрес страницы или вернитесь на главную, чтобы продолжить поиск ментора.
        </p>
        <Link to={ROUTES.home} className="not-found-link">
          Перейти на главную
        </Link>
      </section>
    </main>
  );
};

export default NotFoundScreen;
