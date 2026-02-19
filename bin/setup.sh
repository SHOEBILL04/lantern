#!/bin/bash

# Check if docker is available and running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running or you don't have permissions."
    echo "Try running this script with sudo: sudo ./bin/setup.sh"
    exit 1
fi
# Build and start containers
echo "Building and starting containers..."
docker compose up -d --build

# Install PHP dependencies
echo "Installing PHP dependencies..."
docker compose exec app composer install

# Install JS dependencies
echo "Installing Frontend dependencies..."
docker compose exec app bash -c "cd frontend && npm install"

# Setup .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    docker compose exec app php artisan key:generate
    docker compose exec app php artisan jwt:secret
fi

# Run migrations
echo "Running migrations..."
docker compose exec app php artisan migrate

echo "Setup complete! Access the application at http://localhost:8000"
