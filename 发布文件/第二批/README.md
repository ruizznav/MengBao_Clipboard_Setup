# 🐱 萌宝剪贴板

> 可可爱爱的跨平台剪贴板管理工具 · 基于 Tauri v2  
> *让你的复制粘贴变得优雅又治愈 ✨*

<p align="center">
  <img src="screenshots/剪贴板.png" alt="主界面" width="400"/>
</p>

---

## 📖 介绍

萌宝剪贴板是一款**轻量、可爱、高效**的剪贴板管理工具。

它静静地躺在你的系统托盘里，默默记录你复制过的每一段文字、每一张图片、每一个文件。当你需要它们的时候，一键就能找回来——**再也不用担心复制的内容被覆盖了。**

---

## ✨ 功能特性

### 📋 智能剪贴板

| 功能 | 说明 |
|---|---|
| 🪄 **自动记录** | 复制即记录，无需手动操作 |
| 🔍 **快速搜索** | 输入关键词秒搜历史记录 |
| 🖱️ **双击粘贴** | 双击条目自动粘贴到当前窗口 |
| 🔄 **自由排序** | 拖拽排序 + 一键上移/下移 |

<img src="screenshots/剪贴板.png" alt="剪贴板" width="320"/>

### 🗂️ 双层分类系统

**主分类**：默认 / 工作 / 学习 / 等等（支持自定义 + 删除）  
**子分类**：全部 / 文本 / 图片 / 文件

> 在「工作」→「图片」中快速找到工作截图  
> 在「学习」→「文本」中翻阅昨天的笔记

<img src="screenshots/分类管理.png" alt="分类管理" width="320"/>

### 🎨 6 种可爱主题

| 奶油猫 | 蜜桃乌龙 | 薰衣草 |
|---|---|---|
| <img src="screenshots/奶油猫.png" width="150"/> | <img src="screenshots/蜜桃乌龙.png" width="150"/> | <img src="screenshots/薰衣草.png" width="150"/> |
| 温暖奶白，经典耐看 | 粉嫩蜜桃，少女心爆棚 | 优雅紫色，治愈感满满 |

| 晴空 | 抹茶 | 珊瑚 |
|---|---|---|
| <img src="screenshots/晴空.png" width="150"/> | <img src="screenshots/抹茶.png" width="150"/> | <img src="screenshots/珊瑚.png" width="150"/> |
| 清爽蓝色，心情变好 | 清新绿色，自然舒适 | 热情活力，眼前一亮 |

### 💾 备份与恢复

一键备份所有偏好设置和剪贴板内容，支持随时恢复到任意备份版本，数据安全无虞。

### 🚀 系统托盘

- 后台运行，不占任务栏
- 右键菜单：偏好设置 / 开关监听 / 重启 / 退出
- 全局快捷键一键唤醒

---

## 🖼️ 更多界面

| 历史记录 | 偏好设置首页 | 快捷键 |
|---|---|---|
| <img src="screenshots/历史记录.png" width="200"/> | <img src="screenshots/偏好设置首页.png" width="200"/> | <img src="screenshots/快捷键.png" width="200"/> |

| 通用设置 | 关于软件 |
|---|---|
| <img src="screenshots/通用设置.png" width="200"/> | <img src="screenshots/关于.png" width="200"/> |

---

## 📦 下载

[👉 下载萌宝剪贴板 v5.0.0](https://github.com/ruizznav/MengBao_Clipboard_Setup/releases/latest)

**支持平台**：Windows 7 及以上版本（32 位和 64 位）

### 安装包说明

#### 安装包类型
1. **萌宝剪贴板 v5_Setup.exe**（推荐）
   - 完整安装包，支持选择安装目录
   - 自动创建开始菜单和桌面快捷方式
   - 大小：约 7.9 MB

2. **萌宝剪贴板 v5.exe**（便携版）
   - 可直接运行的 exe 文件
   - 无需安装，适合便携使用
   - 大小：约 25.7 MB

---

## 🔧 本地构建

```bash
# 克隆
git clone https://github.com/ruizznav/MengBao_Clipboard_Setup.git
cd MengBao_Clipboard_Setup

# 安装依赖
pnpm install

# 开发模式
pnpm tauri dev

# 打包（不打包安装包）
pnpm tauri build --no-bundle

# 使用 Inno Setup 打包安装包
# 运行 ISCC.exe "installer.iss"
```

---

## 📝 更新日志

### v5.0.0 (2026-05-14)

#### 🐛 Bug 修复

**1. 修复：备份路径和缓存路径重启后恢复默认**
- **问题**：在"备份/存储设置"中修改日志存储路径和缓存路径后，重启应用后又恢复到默认路径
- **原因**：路径只保存在 `useState` 中，没有持久化到 `globalStore.env`
- **修复**：
  - `useMount` 时从 `globalStore.env` 恢复路径
  - `handlePickPath` 时同时更新 `globalStore.env`
  - "恢复默认"按钮也同步更新 `globalStore.env`
- **文件**：`src/pages/Preference/components/Backup/components/SavePath/index.tsx`

**2. 修复：恢复数据时读取不到备份文件**
- **问题**：点击"恢复数据"后，文件对话框中看不到备份文件
- **原因**：文件筛选器的 `name` 字段设置不正确
- **修复**：改为显示所有文件（`filters: [{ extensions: ["*"], name: "所有文件" }]`）
- **文件**：`src/pages/Preference/components/Backup/components/Manual/index.tsx`

**3. 修复：备份后自动弹出文件夹窗口**
- **问题**：备份完成后会自动打开文件资源管理器
- **原因**：调用了 `revealItemInDir(path)` 函数
- **修复**：删除该函数的调用
- **文件**：`src/pages/Preference/components/Backup/components/Manual/index.tsx`

#### ✨ 功能改进

**1. 改进：备份时可以手动选择保存目录**
- **之前**：备份文件只能保存到下载目录
- **现在**：点击"备份数据"后会弹出保存对话框，可以选择保存位置和文件名
- **实现**：使用 Tauri 的 `save()` API
- **文件**：`src/pages/Preference/components/Backup/components/Manual/index.tsx`

**2. 改进：安装包允许选择安装目录**
- **之前**：安装时无法选择安装路径
- **现在**：安装时可以选择安装目录
- **实现**：在 `installer.iss` 中添加 `DisableDirPage=no`
- **文件**：`installer.iss`

#### 📝 使用说明

**备份数据**
1. 打开萌宝剪贴板
2. 进入"设置" → "数据备份"
3. 点击"备份数据"
4. 选择保存位置和文件名
5. 等待备份完成

**恢复数据**
1. 打开萌宝剪贴板
2. 进入"设置" → "数据备份"
3. 点击"恢复数据"
4. 选择备份文件（扩展名为 `萌宝剪贴板-backup`）
5. 确认恢复操作
6. 等待恢复完成

**修改存储路径**
1. 打开萌宝剪贴板
2. 进入"设置" → "数据备份" → "存储设置"
3. 点击"更改"按钮选择新的数据存储目录
4. 点击"日志目录"或"缓存目录"的更改按钮可以分别修改对应路径
5. 修改会立即生效并持久化

---

## 🛠️ 技术栈

```
前端    React + TypeScript + Vite
样式    UnoCSS + Ant Design
后端    Rust + Tauri v2
数据库  SQLite
图标    Hugeicons + Lucide
打包    Inno Setup 6.7.1
```

---

## 📄 开源协议

本项目基于 [Apache 2.0](LICENSE) 协议发布，基于 [EcoPaste](https://github.com/ayangweb/EcoPaste) 修改，感谢原作者的出色工作。

---

<p align="center">
  <sub>Made with 💕 by Ruizz</sub>
  <br>
  <sub>希望它能给你带来便捷与好心情 ✨</sub>
</p>
