@echo off
title Lanzador de Megarecreacion App
echo =========================================================
echo       INICIANDO APLICACION WEB MEGARECREACION
echo =========================================================
echo.

:: Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Por favor, descarga e instala Node.js desde https://nodejs.org/
    echo e intenta ejecutar este script nuevamente.
    echo.
    pause
    exit /b
)

echo [1/3] Verificando e instalando dependencias (Express, CORS)...
call npm install

echo.
echo [2/3] Iniciando el servidor local Express con base de datos JSON...
echo La aplicacion estara disponible en http://localhost:3000
echo.

:: Arrancar el servidor en segundo plano
start "" npm start

echo [3/3] Abriendo el navegador web en la aplicacion...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo =========================================================
echo ¡Todo listo! Mantén esta consola abierta mientras usas la app.
echo =========================================================
echo.
pause
