FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src
COPY docker-entrypoint.sh ./

RUN npm run build

RUN chmod +x docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]