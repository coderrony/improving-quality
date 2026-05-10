# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Build-time public env for Vite (no secrets here — use ARG/ENV from CI)
ARG VITE_API_URL=
ARG VITE_ENV=production
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENV=$VITE_ENV

RUN npm run build

FROM nginx:1.26-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
