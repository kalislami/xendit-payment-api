# ---------- build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# install deps
COPY package*.json tsconfig.json ./
RUN npm ci

# copy source & build
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build

# ---------- production stage ----------
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# install prod deps only
COPY package*.json ./
RUN npm ci --omit=dev

# copy built files & prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/generated ./dist/generated
COPY prisma ./prisma

COPY docker-entry.sh .

# buka port
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entry.sh"]
