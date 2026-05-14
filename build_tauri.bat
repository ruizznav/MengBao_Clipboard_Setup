@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d "G:\私人文件\开发\EcoPaste_Source"
pnpm tauri build --no-bundle
pause
