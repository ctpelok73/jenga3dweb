@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:menu
cls
echo.
echo ╔════════════════════════════════════════════╗
echo ║       Jenga 3D - Dev Server Manager        ║
echo ╚════════════════════════════════════════════╝
echo.
echo 1. Запустить сервер
echo 2. Перезапустить сервер
echo 3. Остановить сервер
echo 4. Выход
echo.
set /p choice="Выберите действие (1-4): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto restart
if "%choice%"=="3" goto stop
if "%choice%"=="4" exit /b 0

echo Неверный выбор. Попробуйте снова.
timeout /t 2 >nul
goto menu

:start
echo.
echo [*] Проверка зависимостей...
if not exist "node_modules" (
    echo [*] Установка npm зависимостей...
    call npm install
)
echo.
echo [+] Запуск сервера разработки...
echo [*] Локально: http://localhost:5173
echo [*] Из локальной сети: http://IP_ЭТОГО_КОМПЬЮТЕРА:5173
echo.
call npm run dev -- --host 0.0.0.0
pause
goto menu

:restart
echo.
echo [*] Остановка текущего сервера...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo [+] Перезапуск сервера...
echo [*] Локально: http://localhost:5173
echo [*] Из локальной сети: http://IP_ЭТОГО_КОМПЬЮТЕРА:5173
echo.
call npm run dev -- --host 0.0.0.0
pause
goto menu

:stop
echo.
echo [*] Остановка сервера...
taskkill /F /IM node.exe >nul 2>&1
echo [+] Сервер остановлен.
echo.
timeout /t 2 >nul
goto menu
