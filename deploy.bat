@echo off
docker-compose up --build -d
git add . 
git commit -m "Auto-deployment commit" 
git push origin main 
echo Deployment and git push completed.