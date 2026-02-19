@echo off

:: Check if docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running or you don't have permissions.
    echo Please make sure Docker Desktop is running.
    pause
    exit /b 1
)

:: Build and start containers
echo Building and starting containers...
docker compose up -d --build

:: Install PHP dependencies
echo Installing PHP dependencies...
docker compose exec app composer install

:: Install JS dependencies
echo Installing Frontend dependencies...
docker compose exec app bash -c "cd frontend && npm install"

:: Setup .env if not exists
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    docker compose exec app php artisan key:generate
    docker compose exec app php artisan jwt:secret
)

:: Run migrations
echo Running migrations...
docker compose exec app php artisan migrate

echo Setup complete! Access the application at http://localhost:8000
pause
