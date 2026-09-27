@echo off
title Khoi dong Phan mem Tong dai Thanh Thien
color 0A

echo ========================================================
echo       KHOI DONG PHAN MEM TONG DAI NHÀ XE THANH THIEN
echo ========================================================
echo.

echo [1/3] Kiem tra phien ban Node.js...
node -v
echo.

echo [2/3] Dang khoi dong Prisma Studio de quan ly Database...
:: Mở một cửa sổ dòng lệnh mới chạy Prisma Studio
start cmd /k "title Prisma Database Studio & echo Dang tai giao dien quan ly Database... & npx prisma studio"

echo [3/3] Dang khoi dong he thong dat ve (Next.js)...
echo May chu se chay tai dia chi: http://localhost:3000
echo.

:: Mở trình duyệt web tự động trỏ tới localhost
start http://localhost:3000

:: Chạy Next.js ở cửa sổ hiện tại
npm run dev

pause
