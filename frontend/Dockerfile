FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --no-audit --no-fund

COPY . .

ENV HOST=0.0.0.0 \
    PORT=3000 \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true

EXPOSE 3000

CMD ["npm", "start"]
