; 萌宝剪贴板 v5 安装包脚本 (Inno Setup)
; 使用方式: "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss

#define MyAppName "萌宝剪贴板 v5"
#define MyAppVersion "0.6.0-beta.3"
#define MyAppPublisher "萌宝工作室"
#define MyAppExeName "萌宝剪贴板 v5.exe"

[Setup]
AppId={{8A7E3F20-5B9C-4A3D-9F1E-2C8D6B4A5F3E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra
SolidCompression=yes
OutputDir=.
OutputBaseFilename=萌宝剪贴板 v5_Setup
SetupIconFile=src-tauri\icons\icon.ico
UninstallDisplayName={#MyAppName}
PrivilegesRequired=admin
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式："; Flags: checkedonce

[Files]
Source: "target\release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "立即运行萌宝剪贴板"; Flags: postinstall nowait skipifsilent

; 卸载时删除所有文件
[UninstallDelete]
Type: files; Name: "{app}\*"
Type: dirifempty; Name: "{app}"
Type: files; Name: "{localappdata}\com.mengbao.clipboard\*"
Type: dirifempty; Name: "{localappdata}\com.mengbao.clipboard"
Type: files; Name: "{userappdata}\com.mengbao.clipboard\*"
Type: dirifempty; Name: "{userappdata}\com.mengbao.clipboard"

[Code]
var
  ExitCode: Integer;

// 检测程序是否正在运行
function IsAppRunning: Boolean;
var
  ResultCode: Integer;
begin
  Result := False;
  // 用 tasklist 检测进程
  if Exec('powershell', '-NoProfile -Command "if (Get-Process -Name \"萌宝剪贴板 v5\" -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
      Result := True;
  end;
end;

// 卸载前检查：程序在运行就不让卸载
function InitializeUninstall: Boolean;
begin
  if IsAppRunning then
  begin
    SuppressibleMsgBox('请先关闭萌宝剪贴板再卸载！' + #13#10 + #13#10 + '右键托盘图标 → 退出应用', mbError, MB_OK, IDOK);
    Result := False;
  end else
    Result := True;
end;

// 卸载结束后清理残留
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // 确保目录被删除
    Exec('rmdir', '/s /q "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
  end;
end;
