@echo off
cd /d "%~dp0"
echo 正在启动“四川民族音乐游戏”网页服务器...
echo.
echo 电脑本机打开：
echo   http://127.0.0.1:8765/
echo.
echo 手机访问方法：
echo   1. 手机和电脑连接同一个 Wi-Fi
echo   2. 运行后查看下方显示的局域网地址
echo   3. 用手机浏览器打开该地址
echo.
node serve-8765.js
pause
