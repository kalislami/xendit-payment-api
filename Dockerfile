# ---------- build stage ----------
FROM node:23-alpine AS builder
WORKDIR /app

# install deps
COPY package*.json tsconfig.json ./
RUN npm ci

# copy source & build
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build

# ---------- production stage ----------
FROM node:23-alpine
WORKDIR /app

ENV NODE_ENV=production

# install prod deps only
COPY package*.json ./
RUN npm ci --omit=dev

# copy built files & prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/generated ./src/generated
COPY prisma ./prisma

# copy entry script (migrate & start)
COPY docker-entry.sh .

# buka port
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entry.sh"]
