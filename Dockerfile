FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY web/package.json ./web/
RUN npm install && cd web && npm install
COPY web ./web
RUN npm run build:web

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=builder /app/web/dist ./web/dist
EXPOSE 8080
CMD ["node", "server/index.mjs"]