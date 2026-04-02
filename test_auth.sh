#!/bin/bash
# Скрипт для тестирования схемы авторизации YogaVibe

BASE_URL="http://localhost:8000/api/v1"

echo "🧪 Тестирование схемы авторизации YogaVibe"
echo "=========================================="

# 1. Регистрация пользователя
echo "1. Регистрация пользователя..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
  echo "✅ Регистрация успешна"
else
  echo "❌ Ошибка регистрации: $REGISTER_RESPONSE"
  exit 1
fi

# Извлекаем токены
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4)

echo "   Access token: ${ACCESS_TOKEN:0:20}..."
echo "   Refresh token: ${REFRESH_TOKEN:0:20}..."

# 2. Проверка доступа к защищенному endpoint
echo ""
echo "2. Проверка доступа к защищенному endpoint..."
USER_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/users/me")

if echo "$USER_RESPONSE" | grep -q "username"; then
  echo "✅ Доступ к защищенному endpoint разрешен"
else
  echo "❌ Ошибка доступа: $USER_RESPONSE"
fi

# 3. Повторный вход (должен отозвать предыдущие токены)
echo ""
echo "3. Повторный вход (тест отзыва токенов)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "testuser",
    "password": "testpass123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Повторный вход успешен"
  NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
else
  echo "❌ Ошибка повторного входа: $LOGIN_RESPONSE"
  exit 1
fi

# 4. Проверка, что старый токен больше не работает
echo ""
echo "4. Проверка отзыва старого токена..."
OLD_TOKEN_CHECK=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/users/me")

if echo "$OLD_TOKEN_CHECK" | grep -q "401"; then
  echo "✅ Старый токен отозван (401 ошибка)"
else
  echo "❌ Старый токен все еще работает: $OLD_TOKEN_CHECK"
fi

# 5. Проверка работы нового токена
echo ""
echo "5. Проверка работы нового токена..."
NEW_TOKEN_CHECK=$(curl -s -H "Authorization: Bearer $NEW_ACCESS_TOKEN" "$BASE_URL/users/me")

if echo "$NEW_TOKEN_CHECK" | grep -q "username"; then
  echo "✅ Новый токен работает"
else
  echo "❌ Новый токен не работает: $NEW_TOKEN_CHECK"
fi

# 6. Тест обновления токенов
echo ""
echo "6. Тест обновления токенов..."
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}")

if echo "$REFRESH_RESPONSE" | grep -q "access_token"; then
  echo "✅ Обновление токенов работает"
else
  echo "❌ Ошибка обновления: $REFRESH_RESPONSE"
fi

echo ""
echo "🎉 Тестирование завершено!"
echo "Для полной проверки запустите фронтенд и протестируйте сценарии входа/выхода в браузере."