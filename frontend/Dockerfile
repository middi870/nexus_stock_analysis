# ── NEXUS Frontend Dockerfile ─────────────────────────────────────────────────
# Stage 1: build the React/Vite app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# VITE_API_URL is baked in at build time.
# On Railway: set VITE_API_URL to your backend service's public URL.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


# Stage 2: serve with nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
