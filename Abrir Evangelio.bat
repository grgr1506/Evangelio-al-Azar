@echo off
cd /d "%~dp0"
echo Abriendo Evangelio al azar en http://localhost:5510 ...
echo (Cierra esta ventana para apagar la app)
start "" http://localhost:5510
python -m http.server 5510
