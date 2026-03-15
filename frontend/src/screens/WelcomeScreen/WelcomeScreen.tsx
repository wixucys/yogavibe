import React, { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomeScreen.css';
import eyeIcon from './eye.svg';
import talkIcon from './talk.svg';
import commIcon from './comm.svg';

const WelcomeScreen = (): JSX.Element => {
  const navigate = useNavigate();

  const handleFindMentor = (): void => {
    navigate('/login');
  };

  return (
    <div className="welcome-screen">
      <div className="content">
        <div className="main-text">
          <h1>
            Йога — это не только асаны
            <br />
            Найдите того, кто покажет путь
          </h1>

          <p className="description">
            Соединяем искателей с опытными наставниками для персонального роста
          </p>

          <button
            className="cta-button"
            onClick={handleFindMentor}
            aria-label="Найти ментора для занятий йогой"
          >
            НАЙТИ МЕНТОРА
          </button>
        </div>
      </div>

      <footer className="footer">
        <div className="how-it-works">
          <h2>КАК ЭТО РАБОТАЕТ</h2>

          <div className="steps">
            <div className="step">
              <div className="step-header">
                <img
                  src={eyeIcon}
                  alt="Иконка глаза - выбор ментора"
                  className="step-icon"
                />
                <h3>ВЫБЕРИ МЕНТОРА</h3>
              </div>
              <p>
                Мы тщательно отбираем каждого наставника в нашем сообществе.
                Здесь вы можете найти специалистов с разным опытом и подходом.
                Вы можете быть уверены в качестве и профессионализме будущего наставника.
                Просто откройте профили преподавателей, изучите их методику — и выберите того,
                кому захочется доверить свое развитие.
              </p>
            </div>

            <div className="step">
              <div className="step-header">
                <img
                  src={talkIcon}
                  alt="Иконка диалога - выбор даты и времени"
                  className="step-icon"
                />
                <h3>ВЫБЕРИ ДАТУ И ВРЕМЯ</h3>
              </div>
              <p>
                Как только вы определитесь с наставником, вам нужно выбрать день и время для сессии.
                Просто выберите удобный слот в расписании наставника. После подтверждения вы получите
                все детали в разделе «Мои сессии».
              </p>
            </div>

            <div className="step">
              <div className="step-header">
                <img
                  src={commIcon}
                  alt="Иконка сообщения - дело за нами"
                  className="step-icon"
                />
                <h3>ДЕЛО ЗА НАМИ</h3>
              </div>
              <p>
                Мы отправим вам напоминание о сессии. Остается только подготовиться и настроиться
                на продуктивную работу. Мы создаем условия, где каждый может найти необходимую
                поддержку и раскрыть свой потенциал. Осталось только сделать первый шаг
                навстречу изменениям.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomeScreen;