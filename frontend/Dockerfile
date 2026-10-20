# Минимальный рантайм-образ Nginx для локально собранных файлов фронтенда (dist)
FROM nginx:alpine

# Установка openssl для генерации SSL-сертификатов на лету
RUN sed -i 's/dl-cdn.alpinelinux.org/mirror.yandex.ru\/mirrors/g' /etc/apk/repositories && \
    apk add --no-cache openssl

# Копируем готовый собранный PWA из папки dist (без запуска npm ci и компиляции C++ на сервере)
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем папку static для монтирования тома, чтобы избежать ошибок Read-Only файловой системы
RUN mkdir -p /usr/share/nginx/html/static

# Создаем скрипт-обертку для проверки и генерации локального SSL
RUN echo -e '#!/bin/sh\n\
mkdir -p /etc/nginx/certs\n\
if [ -f /etc/letsencrypt/live/skuf-net.ru/fullchain.pem ]; then\n\
  echo "LetsEncrypt certificates found. Symlinking..."\n\
  ln -sf /etc/letsencrypt/live/skuf-net.ru/fullchain.pem /etc/nginx/certs/fullchain.pem\n\
  ln -sf /etc/letsencrypt/live/skuf-net.ru/privkey.pem /etc/nginx/certs/privkey.pem\n\
else\n\
  echo "LetsEncrypt certificates not found. Generating self-signed fallback certificates..."\n\
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\\n\
  -keyout /etc/nginx/certs/privkey.pem \\\n\
  -out /etc/nginx/certs/fullchain.pem \\\n\
  -subj "/CN=localhost"\n\
fi\n\
exec nginx -g "daemon off;"' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80 443
CMD ["/entrypoint.sh"]
