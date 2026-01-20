@echo off

cd /d D:\xampp\htdocs\Store

D:\xampp\php\php.exe artisan reverb:start --host=192.168.1.27 --port=82

timeout /t 5 /nobreak
goto :start