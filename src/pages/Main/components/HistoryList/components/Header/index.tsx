import { useCreation } from "ahooks";
import { Flex } from "antd";
import clsx from "clsx";
import { filesize } from "filesize";
import { type FC, type MouseEvent, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import Scrollbar from "@/components/Scrollbar";
import UnoIcon from "@/components/UnoIcon";
import { MainContext } from "@/pages/Main";
import { transferData } from "@/pages/Preference/components/Clipboard/components/OperationButton";
import { pasteToClipboard, writeToClipboard } from "@/plugins/clipboard";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import type { OperationButton } from "@/types/store";
import { dayjs } from "@/utils/dayjs";

interface HeaderProps {
  data: DatabaseSchemaHistory;
  handleNote: () => void;
  handleDelete: () => void;
  handleMoveUp?: () => void;
  handleMoveDown?: () => void;
}

const Header: FC<HeaderProps> = (props) => {
  const { data } = props;
  const { id, type, value, count, createTime, subtype } = data;
  const { rootState } = useContext(MainContext);
  const { t, i18n } = useTranslation();
  const { content } = useSnapshot(clipboardStore);

  const operationButtons = useCreation(() => {
    return (content.operationButtons || [])
      .map((key) => transferData.find((data) => data.key === key))
      .filter(Boolean);
  }, [content.operationButtons]);

  const renderType = () => {
    switch (subtype) {
      case "url":
        return t("clipboard.label.link");
      case "email":
        return t("clipboard.label.email");
      case "color":
        return t("clipboard.label.color");
      case "path":
        return t("clipboard.label.path");
    }

    switch (type) {
      case "text":
        return t("clipboard.label.plain_text");
      case "rtf":
        return t("clipboard.label.rtf");
      case "html":
        return t("clipboard.label.html");
      case "image":
        return t("clipboard.label.image");
      case "files":
        // 防御：t() 内部可能因 i18next 插值异常而返回 undefined
        try {
          return t("clipboard.label.n_files", {
            replace: [Array.isArray(value) ? value.length : 0],
          }) || `${Array.isArray(value) ? value.length : 0} 个文件`;
        } catch {
          return `${Array.isArray(value) ? value.length : 0} 个文件`;
        }
    }

    return type || "";
  };

  const renderCount = () => {
    const safeCount = count ?? 0;

    if (type === "files" || type === "image") {
      return filesize(safeCount, { standard: "jedec" });
    }

    // 防御：t() 插值可能异常
    try {
      return (
        t("clipboard.label.n_chars", { replace: [safeCount] }) ||
        `${safeCount} 个字符`
      );
    } catch {
      return `${safeCount} 个字符`;
    }
  };

  const renderPixel = () => {
    if (type !== "image") return;

    const { width, height } = data;

    return (
      <span>
        {width}×{height}
      </span>
    );
  };

  const handleClick = (event: MouseEvent, key: OperationButton) => {
    const { handleNote, handleDelete, handleMoveUp, handleMoveDown } = props;

    event.stopPropagation();

    switch (key) {
      case "copy":
        return writeToClipboard(data);
      case "pastePlain":
        return pasteToClipboard(data, true);
      case "note":
        return handleNote();
      case "delete":
        return handleDelete();
      case "moveUp":
        return handleMoveUp?.();
      case "moveDown":
        return handleMoveDown?.();
    }
  };

  return (
    <Flex className="text-color-2" gap="small" justify="space-between">
      <Scrollbar thumbSize={0}>
        <Flex className="flex-1 whitespace-nowrap text-xs" gap="small">
          <span>{renderType()}</span>
          <span>{renderCount()}</span>
          {renderPixel()}
          <span>{dayjs(createTime || new Date()).locale(i18n.language).fromNow()}</span>
        </Flex>
      </Scrollbar>

      <Flex
        align="center"
        className={clsx("opacity-0 transition group-hover:opacity-100", {
          "opacity-100": rootState.activeId === id,
        })}
        gap={6}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {operationButtons.map((item) => {
          const { key, icon, title } = item;

          return (
            <UnoIcon
              hoverable
              key={key}
              name={icon}
              onClick={(event) => handleClick(event, key)}
              title={t(title)}
            />
          );
        })}
      </Flex>
    </Flex>
  );
};

export default Header;
