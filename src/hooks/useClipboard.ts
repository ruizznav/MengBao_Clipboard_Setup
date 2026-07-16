import { cloneDeep } from "es-toolkit";
import { isEmpty, remove } from "es-toolkit/compat";
import { nanoid } from "nanoid";
import { useEffect, useRef } from "react";
import {
  type ClipboardChangeOptions,
  onClipboardChange,
  startListening,
} from "tauri-plugin-clipboard-x-api";
import { fullName } from "tauri-plugin-fs-pro-api";
import {
  insertHistory,
  selectHistory,
  updateHistory,
} from "@/database/history";
import type { State } from "@/pages/Main";
import { getClipboardTextSubtype } from "@/plugins/clipboard";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import { formatDate } from "@/utils/dayjs";

export const useClipboard = (
  state: State,
  options?: ClipboardChangeOptions,
) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      await startListening();

      onClipboardChange(async (result) => {
        const { files, image, html, rtf, text } = result;

        if (isEmpty(result) || Object.values(result).every(isEmpty)) return;

        const { copyPlain } = clipboardStore.content;

        const data = {
          createTime: formatDate(),
          group: "_default",
          id: nanoid(),
          search: text?.value,
        } as DatabaseSchemaHistory;

        if (files) {
          Object.assign(data, files, {
            search: files.value.join(" "),
          });
        } else if (html && !copyPlain) {
          Object.assign(data, html);
        } else if (rtf && !copyPlain) {
          Object.assign(data, rtf);
        } else if (text) {
          const subtype = await getClipboardTextSubtype(text.value);

          Object.assign(data, text, {
            subtype,
          });
        } else if (image) {
          Object.assign(data, image);
        }

        const sqlData = cloneDeep(data);

        const { type, value, group, createTime } = data;

        if (type === "image") {
          sqlData.value = await fullName(value);
        }

        if (type === "files") {
          sqlData.value = JSON.stringify(value);
        }

        const [matched] = await selectHistory((qb) => {
          const { type, value } = sqlData;

          return qb.where("type", "=", type).where("value", "=", value);
        });

        // 判断新内容是否在当前选中的分类中可见（需同时匹配主分类 + 子分类）
        const { subType } = state;
        const typeMatch = !subType || subType === "all" || subType === type;
        const visible = state.group === group && typeMatch;

        if (matched) {
          if (!clipboardStore.content.autoSort) return;

          const { id } = matched;

          if (visible) {
            remove(state.list, { id });

            state.list.unshift({ ...data, id });
          }

          try {
            await updateHistory(id, { createTime });
          } catch (e) {
            // 关闭应用时驱动被销毁是正常现象，忽略即可
            console.warn("[useClipboard] updateHistory rejected:", e);
          }
          return;
        }

        if (visible) {
          state.list.unshift(data);
        }

        try {
          await insertHistory(sqlData);
        } catch (e) {
          console.warn("[useClipboard] insertHistory rejected:", e);
        }
      }, options);
    };

    init();
  }, []);
};
