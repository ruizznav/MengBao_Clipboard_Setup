import { Menu, MenuItem, Submenu, type MenuItemOptions } from "@tauri-apps/api/menu";
import { downloadDir } from "@tauri-apps/api/path";
import { copyFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { find, isArray, remove } from "es-toolkit/compat";
import { type MouseEvent, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import { selectGroups } from "@/database/group";
import { deleteHistory, updateHistory, updateHistorySortOrder } from "@/database/history";
import { MainContext } from "@/pages/Main";
import type { ItemProps } from "@/pages/Main/components/HistoryList/components/Item";
import { pasteToClipboard, writeToClipboard } from "@/plugins/clipboard";
import { clipboardStore } from "@/stores/clipboard";
import { globalStore } from "@/stores/global";
import { isMac } from "@/utils/is";
import { join } from "@/utils/path";

interface UseContextMenuProps extends ItemProps {
  handleNext: () => void;
}

interface ContextMenuItem extends MenuItemOptions {
  hide?: boolean;
}

export const useContextMenu = (props: UseContextMenuProps) => {
  const { data, deleteModal, handleNote, handleNext } = props;
  const { id, type, value, group, favorite, subtype } = data;
  const { t } = useTranslation();
  const { env } = useSnapshot(globalStore);
  const { rootState } = useContext(MainContext);

  const pasteAsText = () => {
    return pasteToClipboard(data, true);
  };

  const handleFavorite = async () => {
    const nextFavorite = !favorite;

    const matched = find(rootState.list, { id });

    if (!matched) return;

    matched.favorite = nextFavorite;

    updateHistory(id, { favorite: nextFavorite });
  };

  const openToBrowser = () => {
    if (type !== "text") return;

    const url = value.startsWith("http") ? value : `http://${value}`;

    openUrl(url);
  };

  const exportToFile = async () => {
    if (isArray(value)) return;

    const extname = type === "text" ? "txt" : type;
    const fileName = `${env.appName}_${id}.${extname}`;
    const path = join(await downloadDir(), fileName);

    await writeTextFile(path, value);

    revealItemInDir(path);
  };

  const downloadImage = async () => {
    if (type !== "image") return;

    const fileName = `${env.appName}_${id}.png`;
    const path = join(await downloadDir(), fileName);

    await copyFile(value, path);

    revealItemInDir(path);
  };

  const openToFinder = () => {
    if (type === "text") {
      return revealItemInDir(value);
    }

    const [file] = value;

    revealItemInDir(file);
  };

  const handleDelete = async () => {
    const matched = find(rootState.list, { id });

    if (!matched) return;

    let confirmed = true;

    if (clipboardStore.content.deleteConfirm) {
      confirmed = await deleteModal.confirm({
        afterClose() {
          // 关闭确认框后焦点还在，需要手动取消焦点
          (document.activeElement as HTMLElement)?.blur();
        },
        centered: true,
        content: t("clipboard.hints.delete_modal_content"),
      });
    }

    if (!confirmed) return;

    if (id === rootState.activeId) {
      handleNext();
    }

    remove(rootState.list, { id });

    deleteHistory(data);
  };

  const handleContextMenu = async (event: MouseEvent) => {
    event.preventDefault();

    rootState.activeId = id;

    const items: ContextMenuItem[] = [
      {
        action: () => writeToClipboard(data),
        text: t("clipboard.button.context_menu.copy"),
      },
      {
        action: handleNote,
        text: t("clipboard.button.context_menu.note"),
      },
      {
        action: pasteAsText,
        hide: type !== "html" && type !== "rtf",
        text: t("clipboard.button.context_menu.paste_as_plain_text"),
      },
      {
        action: pasteAsText,
        hide: type !== "files",
        text: t("clipboard.button.context_menu.paste_as_path"),
      },
      {
        action: handleFavorite,
        text: favorite
          ? t("clipboard.button.context_menu.unfavorite")
          : t("clipboard.button.context_menu.favorite"),
      },
      {
        action: openToBrowser,
        hide: subtype !== "url",
        text: t("clipboard.button.context_menu.open_in_browser"),
      },
      {
        action: () => openUrl(`mailto:${value}`),
        hide: subtype !== "email",
        text: t("clipboard.button.context_menu.send_email"),
      },
      {
        action: exportToFile,
        hide: type !== "text",
        text: t("clipboard.button.context_menu.export_as_file"),
      },
      {
        action: downloadImage,
        hide: type !== "image",
        text: t("clipboard.button.context_menu.download_image"),
      },
      {
        action: openToFinder,
        hide: type !== "files" && subtype !== "path",
        text: isMac
          ? t("clipboard.button.context_menu.show_in_finder")
          : t("clipboard.button.context_menu.show_in_file_explorer"),
      },
      {
        action: handleDelete,
        text: t("clipboard.button.context_menu.delete"),
      },
    ];

    // --- 排序操作 ---
    const menu = await Menu.new();

    for await (const item of items.filter(({ hide }) => !hide)) {
      const menuItem = await MenuItem.new(item);

      await menu.append(menuItem);
    }

    // 上移 / 下移
    const listForSort = rootState.list;
    const currentIndex = listForSort.findIndex((i) => i.id === id);

    if (currentIndex > 0) {
      const moveUpItem = await MenuItem.new({
        text: "上移",
        action: async () => {
          const prevItem = listForSort[currentIndex - 1];
          const curItem = listForSort[currentIndex];
          const prevSort = prevItem.sortOrder ?? 0;
          const curSort = curItem.sortOrder ?? 0;

          await Promise.all([
            updateHistorySortOrder(prevItem.id, curSort),
            updateHistorySortOrder(curItem.id, prevSort),
          ]);

          prevItem.sortOrder = curSort;
          curItem.sortOrder = prevSort;

          rootState.list = [...listForSort].sort(
            (a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0),
          );
        },
      });
      await menu.append(moveUpItem);
    }

    if (currentIndex < listForSort.length - 1) {
      const moveDownItem = await MenuItem.new({
        text: "下移",
        action: async () => {
          const nextItem = listForSort[currentIndex + 1];
          const curItem = listForSort[currentIndex];
          const nextSort = nextItem.sortOrder ?? 0;
          const curSort = curItem.sortOrder ?? 0;

          await Promise.all([
            updateHistorySortOrder(nextItem.id, curSort),
            updateHistorySortOrder(curItem.id, nextSort),
          ]);

          nextItem.sortOrder = curSort;
          curItem.sortOrder = nextSort;

          rootState.list = [...listForSort].sort(
            (a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0),
          );
        },
      });
      await menu.append(moveDownItem);
    }

    // --- 移动到分类 ---
    const allGroups = await selectGroups();
    const moveItems: MenuItem[] = [];

    for (const g of allGroups) {
      if (g.id === group) continue; // 跳过当前分类

      const moveItem = await MenuItem.new({
        text: g.name,
        action: async () => {
          const iconName = g.name;
          // 更新数据库
          await updateHistory(id, { group: g.id });

          // 更新前端列表
          const matched = find(rootState.list, { id });
          if (matched) {
            matched.group = g.id;

            // 移入其他分类则从列表移除（所有分类通用逻辑）
            if (rootState.group !== g.id) {
              // 使用 filter 创建新数组，确保 Valtio 能检测到变化
              rootState.list = rootState.list.filter(item => item.id !== id);
            }
          }
        },
      });
      moveItems.push(moveItem);
    }

    const moveSubmenu = await Submenu.new({
      text: t("clipboard.button.context_menu.move_to"),
      items: moveItems,
    });
    await menu.append(moveSubmenu);

    menu.popup();
  };

  return {
    handleContextMenu,
    handleDelete,
    handleFavorite,
  };
};
