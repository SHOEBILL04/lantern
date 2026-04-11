#!/bin/sh
set -eu

echo "Lantern startup: bootstrapping application..."

wait_for_mysql() {
  attempts=0
  until mysqladmin ping \
    -h"${DB_HOST}" \
    -P"${DB_PORT}" \
    -u"${DB_USERNAME}" \
    -p"${DB_PASSWORD}" \
    --silent >/dev/null 2>&1
  do
    attempts=$((attempts + 1))
    if [ "${attempts}" -ge 30 ]; then
      echo "MySQL did not become reachable in time."
      return 1
    fi
    echo "Waiting for MySQL..."
    sleep 2
  done
}

bootstrap_schema_if_needed() {
  db_connection="${DB_CONNECTION:-mysql}"

  if [ "${db_connection}" != "mysql" ]; then
    echo "Skipping schema bootstrap because DB_CONNECTION=${db_connection}."
    return 0
  fi

  if [ ! -f /var/www/html/schema.sql ]; then
    echo "Skipping schema bootstrap because /var/www/html/schema.sql was not found."
    ls -la /var/www/html || true
    return 0
  fi

  wait_for_mysql

  users_table_present="$(mysql \
    -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_DATABASE}' AND table_name='users';" \
    -h"${DB_HOST}" \
    -P"${DB_PORT}" \
    -u"${DB_USERNAME}" \
    -p"${DB_PASSWORD}")"

  if [ "${users_table_present}" = "0" ]; then
    echo "No application schema detected. Importing schema.sql..."
    awk '
      BEGIN { skip = 0 }
      /^DELIMITER \/\// { skip = 1; next }
      /^DELIMITER ;/ { skip = 0; next }
      skip == 0 && $0 !~ /^(CREATE DATABASE|CREATE USER|GRANT |FLUSH PRIVILEGES|USE )/ { print }
    ' /var/www/html/schema.sql > /tmp/lantern-schema.sql
    if ! mysql \
      -h"${DB_HOST}" \
      -P"${DB_PORT}" \
      -u"${DB_USERNAME}" \
      -p"${DB_PASSWORD}" \
      "${DB_DATABASE}" < /tmp/lantern-schema.sql; then
      echo "Schema import failed."
      exit 1
    fi
    echo "Schema import completed."
  else
    echo "Application schema already present."
  fi
}

bootstrap_schema_if_needed

echo "Running Laravel startup commands..."
php artisan package:discover --ansi
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan db:seed --force
echo "Lantern startup complete."

exec apache2-foreground
