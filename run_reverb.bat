@echo off
docker exec -d <container_name> php artisan reverb:start --host=0.0.0.0 --port=8200