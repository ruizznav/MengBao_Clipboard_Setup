import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

(() => {
  const { env, platform } = process;

  const isMac = env.PLATFORM?.startsWith("macos") ?? platform === "darwin";

  const logoName = isMac ? "logo-mac" : "logo";

  const iconFile = "src-tauri/icons/icon.ico";

  // 图标已存在就不重新生成了
  if (existsSync(iconFile)) {
    return;
  }

  const command = `tauri icon src-tauri/assets/${logoName}.png`;

  execSync(command, { stdio: "inherit" });
})();
