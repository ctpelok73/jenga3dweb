@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Запуск dev сервера Jenga 3D...
echo [*] Откройте браузер: http://localhost:5173
echo [*] Нажмите Ctrl+C для остановки сервера
echo.

if not exist "node_modules" (
    echo [*] Установка зависимостей...
    call npm install
)

call npm run dev
