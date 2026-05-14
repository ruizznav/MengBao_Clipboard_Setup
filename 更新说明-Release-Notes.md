# 萌宝剪贴板 v5 - 更新说明

## 🐛 Bug 修复

### 1. 修复：移动到其他分类后，默认分类仍显示该内容
**问题描述**：将剪贴板内容移动到其他分类后，默认分类中仍然显示该内容，导致内容重复出现在多个分类中。

**根本原因**：`useHistoryList.ts` 中的数据库查询逻辑对默认分类（`_default`）做了特殊处理，不按 `group` 字段过滤，导致默认分类显示所有分类的内容。

**修复方案**：
- 修改 `src/hooks/useHistoryList.ts` 第41-42行
- 移除默认分类的特殊例外，所有分类（含默认）均按 `group` 字段过滤
- 默认分类现在只显示 `group = "_default"` 的内容

---

### 2. 修复：点击清空后，移动到其他分类的内容也跟着消失
**问题描述**：在默认分类点击"清空"按钮后，其他分类中的内容也被删除了。

**根本原因**：
1. "清空"功能（`GroupList/index.tsx`）直接删除 `rootState.list` 中的所有记录
2. 由于 Bug 1 的存在，`rootState.list` 包含了所有分类的内容
3. 删除操作误删了其他分类的内容

**修复方案**：
- 先修复 Bug 1，确保 `rootState.list` 只含当前分类的内容
- 清空功能现在只会删除当前分类的内容，不影响其他分类

---

### 3. 修复：从默认分类移动内容到其他分类后，内容没有立即消失
**问题描述**：在默认分类右键内容选择"移动到"其他分类后，内容没有立即从列表消失，需要手动刷新才能看到变化。

**根本原因**：
1. `useContextMenu.ts` 中移动逻辑对默认分类做了特殊例外（第267行）
2. 使用 `lodash.remove()` 修改数组，Valtio 无法正确检测变化

**修复方案**：
- 移除默认分类的特殊例外，统一所有分类的移动逻辑
- 改用 `filter()` 创建新数组赋值给 `rootState.list`，确保 Valtio 能检测到变化并触发视图更新

---

### 4. 修复：偏好设置中删除历史记录后，需要手动刷新才能显示最新内容
**问题描述**：在偏好设置的"历史记录"页面删除历史记录后，主窗口的列表不会自动刷新，需要手动刷新才能看到删除后的效果。

**根本原因**：
1. `deleteHistory()` 是异步函数，但调用时没有 `await`
2. 删除操作还没完成就发送了刷新事件 `REFRESH_CLIPBOARD_LIST`
3. 时序问题导致刷新时数据库还没删除完成

**修复方案**：
- 修改 `src/pages/Preference/components/History/components/Delete/index.tsx`
- 收集所有需要删除的记录到数组
- 使用 `Promise.all()` 等待所有删除操作完成
- 删除完成后再发送刷新事件

---

## 🔧 技术细节

### 修改的文件
1. `src/hooks/useHistoryList.ts` - 修复分类过滤逻辑
2. `src/hooks/useContextMenu.ts` - 修复移动后的状态更新
3. `src/pages/Preference/components/History/components/Delete/index.tsx` - 修复异步删除逻辑

### 前端状态管理
- 使用 Valtio 进行状态管理
- 确保数组修改能被正确检测：`rootState.list = rootState.list.filter(...)` 而非 `remove(rootState.list, ...)`

---

## 📦 安装包信息
- 文件名：`萌宝剪贴板 v5.exe`（NSIS 安装包）
- 构建方式：`pnpm tauri build`
- 输出路径：`src-tauri/target/release/bundle/nsis/`

---

## 🙏 致谢
感谢帅气的主人（ruizznav）的耐心测试和反馈！

---

## 提交信息参考
批次1: `chore: 更新配置文件和根目录 [批次1/4]`
批次2: `feat: 更新核心逻辑和状态管理 [批次2/4]`
批次3: `feat: 更新页面组件和插件 [批次3/4]`
批次4: `feat: 更新Tauri后端和截图 [批次4/4]`

最终发布: `fix: 修复4个分类和删除相关的Bug (v5.1)`
