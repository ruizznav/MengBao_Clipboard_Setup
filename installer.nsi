; 萌宝剪贴板 v5 NSIS 安装脚本
!define PRODUCT_NAME "萌宝剪贴板 v5"
!define PRODUCT_EXE "萌宝剪贴板 v5.exe"
!define PRODUCT_VERSION "5.1.0"
!define PRODUCT_PUBLISHER "萌宝工作室"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "萌宝剪贴板 v5_Setup.exe"
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!include "MUI2.nsh"

; 安装包图标
!define MUI_ICON "src-tauri\icons\icon.ico"
!define MUI_UNICON "src-tauri\icons\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

; ── 检测萌宝剪贴板是否在运行 ──
; 由 Rust 端在 app 启动时创建命名互斥体 "MengBaoClipboardRunning"
; 此处通过 Windows API OpenMutexW 检测其存在: 纯 ASCII / 不经过命令行, 规避中文编码问题
!define APP_MUTEX "MengBaoClipboardRunning"

!macro CheckAppRunning operation
  System::Call 'kernel32::OpenMutexW(i 0x00100000, i 0, w "${APP_MUTEX}") i .r0'
  System::Call 'kernel32::CloseHandle(i r0)'
  ${If} $0 <> 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "萌宝剪贴板正在运行，请先关闭程序后再${operation}。"
    Abort
  ${EndIf}
!macroend

Function .onInit
  !insertmacro CheckAppRunning "安装"
FunctionEnd

Function un.onInit
  !insertmacro CheckAppRunning "卸载"
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  File "target\release\${PRODUCT_EXE}"
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载.lnk" "$INSTDIR\uninstall.exe"
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\${PRODUCT_EXE}"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
SectionEnd
