import { useKeyPress } from "ahooks";
import { message, Modal } from "antd";
import clsx from "clsx";
import {
  type FC,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { emit } from "@tauri-apps/api/event";
import { LISTEN_KEY } from "@/constants";
import { selectGroups } from "@/database/group";
import { deleteHistory } from "@/database/history";
import { useTauriListen } from "@/hooks/useTauriListen";
import type { DatabaseSchemaGroup } from "@/types/database";
import { scrollElementToCenter } from "@/utils/dom";
import { MainContext } from "../..";

/** 子分类配置 */
const SUB_TYPES = [
  { id: "all", labelKey: "clipboard.label.tab.all" },
  { id: "text", labelKey: "clipboard.label.tab.text" },
  { id: "image", labelKey: "clipboard.label.tab.image" },
  { id: "files", labelKey: "clipboard.label.tab.files" },
];

const GroupList: FC = () => {
  const { rootState } = useContext(MainContext);
  const { t } = useTranslation();
  const [groups, setGroups] = useState<DatabaseSchemaGroup[]>([]);

  const loadGroups = useCallback(async () => {
    try {
      const list = await selectGroups();
      // 强制「默认」排第一，其余按 sortOrder 排
      const sorted = [...list].sort((a, b) => {
        if (a.id === "_default") return -1;
        if (b.id === "_default") return 1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
      setGroups(sorted);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useTauriListen(LISTEN_KEY.GROUPS_CHANGED, () => {
    loadGroups();
  });

  useEffect(() => {
    scrollElementToCenter(rootState.group);
  }, [rootState.group]);

  // 切换主分类时重置子分类为「全部」
  const handleGroupChange = (id: string) => {
    rootState.group = id;
    rootState.subType = "all";
  };

  const handleSubTypeChange = (id: string) => {
    rootState.subType = id;
  };

  // --- 清空当前分类 ---
  const handleClearGroup = () => {
    const groupName = groups.find((g) => g.id === rootState.group)?.name ?? "当前";
    Modal.confirm({
      centered: true,
      title: `清空「${groupName}」`,
      content: `将删除当前分类下的所有可见内容，确定吗？`,
      onOk: async () => {
        const { list } = rootState;
        const toDelete = list.filter((item) => {
          if (rootState.subType && rootState.subType !== "all") {
            return item.type === rootState.subType;
          }
          return true;
        });
        // 从前端列表移除
        toDelete.forEach((item) => {
          const idx = rootState.list.findIndex((i) => i.id === item.id);
          if (idx >= 0) rootState.list.splice(idx, 1);
        });
        // 物理删除数据库
        await Promise.all(toDelete.map((item) => deleteHistory(item)));
        message.success("已删除");
        emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      },
      okText: "确定",
      cancelText: "取消",
      okButtonProps: { danger: true },
    });
  };

  // Tab 键切换主分类
  useKeyPress("tab", (event) => {
    const index = groups.findIndex((item) => item.id === rootState.group);
    const length = groups.length;

    let nextIndex = index;

    if (event.shiftKey) {
      nextIndex = index === 0 ? length - 1 : index - 1;
    } else {
      nextIndex = index === length - 1 ? 0 : index + 1;
    }

    rootState.group = groups[nextIndex]?.id ?? "_default";
    rootState.subType = "all";
  });

  return (
    <>
      {/* 第一行：主分类 */}
      <div className="cute-tabs" data-tauri-drag-region>
        {groups.map((item) => {
          const { id, name, color } = item;
          const isChecked = id === rootState.group;

          return (
            <div id={id} key={id}>
              <button
                type="button"
                className={clsx("cute-tab", { active: isChecked })}
                onClick={() => handleGroupChange(id)}
              >
                <span
                  className="cute-tab-dot"
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: id === "_default" ? "#000" : color,
                    marginRight: 5,
                    flexShrink: 0,
                  }}
                />
                {name}
              </button>
            </div>
          );
        })}
      </div>

      {/* 第二行：子分类 */}
      <div className="cute-subtabs" data-tauri-drag-region>
        {SUB_TYPES.map((sub) => {
          const { id } = sub;
          const isChecked = id === rootState.subType;

          return (
            <button
              key={id}
              type="button"
              className={clsx("cute-subtab", {
                "cute-subtab-active": isChecked,
              })}
              onClick={() => handleSubTypeChange(id)}
            >
              {t(sub.labelKey)}
            </button>
          );
        })}

        <button
          type="button"
          className="cute-subtab"
          style={{ marginLeft: "auto", color: "var(--ant-color-error)", fontSize: 12 }}
          onClick={handleClearGroup}
        >
          清空
        </button>
      </div>
    </>
  );
};

export default GroupList;
