FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npm run build
ENV DATABASE_URL=""

EXPOSE 3000

CMD ["sh", "./scripts/start-with-db.sh"]
