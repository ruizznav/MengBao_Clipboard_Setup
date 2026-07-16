import { openPath } from "@tauri-apps/plugin-opener";
import { Flex, message } from "antd";
import type { HookAPI } from "antd/es/modal/useModal";
import clsx from "clsx";
import { type FC, useContext } from "react";
import { Marker } from "react-mark.js";
import { startListening, stopListening } from "tauri-plugin-clipboard-x-api";
import { useSnapshot } from "valtio";
import SafeHtml from "@/components/SafeHtml";
import UnoIcon from "@/components/UnoIcon";
import { LISTEN_KEY } from "@/constants";
import { updateHistory } from "@/database/history";
import { useContextMenu } from "@/hooks/useContextMenu";
import { MainContext } from "@/pages/Main";
import { pasteToClipboard } from "@/plugins/clipboard";
import { hideWindow } from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import Files from "../Files";
import Header from "../Header";
import Image from "../Image";
import Rtf from "../Rtf";
import Text from "../Text";

export interface ItemProps {
  index: number;
  data: DatabaseSchemaHistory;
  deleteModal: HookAPI;
  handleNote: () => void;
}

const Item: FC<ItemProps> = (props) => {
  const { index, data, handleNote } = props;
  const { id, type, note, value } = data;
  const { rootState } = useContext(MainContext);
  const { content } = useSnapshot(clipboardStore);

  const handlePreview = () => {
    if (type !== "image" || !value) return;

    openPath(value);
  };

  const handleNext = () => {
    const { list } = rootState;

    const nextItem = list[index + 1] ?? list[index - 1];

    rootState.activeId = nextItem?.id;
  };

  const handlePrev = () => {
    if (index === 0) return;

    rootState.activeId = rootState.list[index - 1].id;
  };

  rootState.eventBus?.useSubscription((payload) => {
    if (payload.id !== id) return;

    const { handleDelete } = rest;

    switch (payload.action) {
      case LISTEN_KEY.CLIPBOARD_ITEM_PREVIEW:
        return handlePreview();
      case LISTEN_KEY.CLIPBOARD_ITEM_PASTE:
        return pasteToClipboard(data);
      case LISTEN_KEY.CLIPBOARD_ITEM_DELETE:
        return handleDelete();
      case LISTEN_KEY.CLIPBOARD_ITEM_SELECT_PREV:
        return handlePrev();
      case LISTEN_KEY.CLIPBOARD_ITEM_SELECT_NEXT:
        return handleNext();
    }
  });

  const { handleContextMenu, ...rest } = useContextMenu({
    ...props,
    handleNext,
  });

  const handleClick = async (type: typeof content.autoPaste) => {
    rootState.activeId = id;

    if (content.autoPaste !== type) return;

    // 暂停剪贴板监听，防止粘贴触发重复插入
    try {
      stopListening();
    } catch {}

    // 隐藏窗口，让焦点回到目标应用，才能自动粘贴
    await hideWindow();

    await pasteToClipboard(data);

    // 延迟恢复监听
    setTimeout(() => startListening(), 200);
  };

  // --- 上移 / 下移（交换 createTime 实现排序，无需 sortOrder 列）---
  const handleMoveUp = async () => {
    try {
      const list = rootState.list;
      const idx = list.findIndex((i) => i.id === id);
      if (idx <= 0) return;

      const prev = list[idx - 1];
      const cur = list[idx];
      const prevTime = prev.createTime;
      const curTime = cur.createTime;

      await Promise.all([
        updateHistory(prev.id, { createTime: curTime }),
        updateHistory(cur.id, { createTime: prevTime }),
      ]);

      prev.createTime = curTime;
      cur.createTime = prevTime;

      rootState.list = [...list].sort((a, b) => {
        if (a.createTime > b.createTime) return -1;
        if (a.createTime < b.createTime) return 1;
        return 0;
      });
    } catch (err) {
      message.error(`上移失败: ${String(err)}`);
    }
  };

  const handleMoveDown = async () => {
    try {
      const list = rootState.list;
      const idx = list.findIndex((i) => i.id === id);
      if (idx < 0 || idx >= list.length - 1) return;

      const next = list[idx + 1];
      const cur = list[idx];
      const nextTime = next.createTime;
      const curTime = cur.createTime;

      await Promise.all([
        updateHistory(next.id, { createTime: curTime }),
        updateHistory(cur.id, { createTime: nextTime }),
      ]);

      next.createTime = curTime;
      cur.createTime = nextTime;

      rootState.list = [...list].sort((a, b) => {
        if (a.createTime > b.createTime) return -1;
        if (a.createTime < b.createTime) return 1;
        return 0;
      });
    } catch (err) {
      message.error(`下移失败: ${String(err)}`);
    }
  };

  const renderContent = () => {
    try {
      switch (type) {
        case "text":
          return <Text {...data} />;
        case "rtf":
          return <Rtf {...data} />;
        case "html":
          return <SafeHtml {...data} />;
        case "image":
          return <Image {...data} />;
        case "files":
          return <Files {...data} />;
      }
    } catch (err) {
      console.error("[Item] renderContent error:", err, data);
      return (
        <span style={{ color: "var(--ant-color-error)", fontSize: 12 }}>
          [渲染异常: {type}]
        </span>
      );
    }
  };

  return (
    <Flex
      className={clsx("group max-h-30", {
        "cute-card": rootState.activeId !== id,
        "cute-card active": rootState.activeId === id,
      })}
      gap={6}
      onClick={() => handleClick("single")}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => handleClick("double")}
      style={{ overflow: "hidden", position: "relative" }}
      vertical
    >
      <Flex className="flex-1" style={{ minWidth: 0 }} vertical>
        <Header
          {...rest}
          data={data}
          handleMoveDown={handleMoveDown}
          handleMoveUp={handleMoveUp}
          handleNote={handleNote}
        />

        <div className="relative flex-1 select-auto overflow-hidden break-words children:transition">
          <div
            className={clsx(
              "pointer-events-none absolute inset-0 line-clamp-4 children:inline opacity-0",
              {
                "group-hover:opacity-0": content.showOriginalContent,
                "opacity-100": note,
              },
            )}
          >
            <UnoIcon
              className="mr-0.5 translate-y-0.5"
              name="i-hugeicons:task-edit-01"
            />

            <Marker mark={rootState.search}>{note}</Marker>
          </div>

          <div
            className={clsx("h-full", {
              "group-hover:opacity-100": content.showOriginalContent,
              "opacity-0": note,
            })}
          >
            {renderContent()}
          </div>
        </div>
      </Flex>
    </Flex>
  );
};

export default Item;
