# 萌宝剪贴板 v5 - 批次4 上传文件清单（最后一批）

## 本批次包含：src-tauri + screenshots + scripts + src-tauri 资源文件
## 文件数：71个

### 上传步骤：
1. 打开 https://github.com/ruizznav/MengBao_Clipboard_Setup/upload
2. 选择同一分支
3. 拖拽本批次文件到网页中
4. 提交信息：`feat: 更新Tauri后端和截图 [批次4/4]`
5. 点击 "Commit changes"
6. 所有批次上传完成后，创建 Release 并上传安装包

---

## 文件清单：

### screenshots/ (截图)
- screenshots/分类管理.png
- screenshots/关于.png
- screenshots/剪贴板.png
- screenshots/快捷键.png
- screenshots/历史记录.png
- screenshots/蜜桃乌龙.png
- screenshots/抹茶.png
- screenshots/奶油猫.png
- screenshots/偏好设置首页.png
- screenshots/晴空.png
- screenshots/通用设置.png
- screenshots/薰衣草.png

### scripts/ (构建脚本)
- scripts/buildIcon.ts
- scripts/release.ts

### src-tauri/ (Tauri后端 - Rust)
- src-tauri/.gitignore
- src-tauri/build.rs
- src-tauri/Cargo.toml
- src-tauri/EcoPaste.desktop
- src-tauri/Info.plist
- src-tauri/tauri.conf.json
- src-tauri/tauri.linux.conf.json
- src-tauri/tauri.macos.conf.json
- src-tauri/tauri.windows.conf.json

### src-tauri/assets/
- src-tauri/assets/logo.png
- src-tauri/assets/logo-mac.png
- src-tauri/assets/tray.ico
- src-tauri/assets/tray-mac.ico

### src-tauri/capabilities/
- src-tauri/capabilities/default.json

### src-tauri/gen/schemas/
- src-tauri/gen/schemas/acl-manifests.json
- src-tauri/gen/schemas/capabilities.json
- src-tauri/gen/schemas/desktop-schema.json
- src-tauri/gen/schemas/windows-schema.json

### src-tauri/src/ (Rust源码)
- src-tauri/src/core/mod.rs
- src-tauri/src/core/prevent_default.rs
- src-tauri/src/core/setup/linux.rs
- src-tauri/src/core/setup/macos.rs
- src-tauri/src/core/setup/mod.rs
- src-tauri/src/core/setup/windows.rs
- src-tauri/src/lib.rs
- src-tauri/src/main.rs

### src-tauri/src/plugins/autostart/
( autostart 插件文件... )

### src-tauri/src/plugins/paste/
( paste 插件文件... )

### src-tauri/src/plugins/window/
( window 插件文件... )
