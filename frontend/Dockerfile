FROM node:20-alpine as builder

WORKDIR /app

COPY frontend/ package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine

COPY frontend/nginx/nginx.conf /etc/nginx/nginx.conf
COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/backend:8000/127.0.0.1:8000/g' /etc/nginx/conf.d/default.conf && \
    nginx -t && \
    sed -i 's/127.0.0.1:8000/backend:8000/g' /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
