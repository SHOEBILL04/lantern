#!/bin/sh
set -eu

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
  if [ "${DB_CONNECTION:-}" != "mysql" ] || [ ! -f /var/www/html/schema.sql ]; then
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
    grep -viE '^(CREATE DATABASE|CREATE USER|GRANT |FLUSH PRIVILEGES|USE )' /var/www/html/schema.sql > /tmp/lantern-schema.sql
    mysql \
      -h"${DB_HOST}" \
      -P"${DB_PORT}" \
      -u"${DB_USERNAME}" \
      -p"${DB_PASSWORD}" \
      "${DB_DATABASE}" < /tmp/lantern-schema.sql
  fi
}

bootstrap_schema_if_needed

exec apache2-foreground
