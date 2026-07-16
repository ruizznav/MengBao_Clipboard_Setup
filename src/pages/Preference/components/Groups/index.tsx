import { emit } from "@tauri-apps/api/event";
import { useAsyncEffect } from "ahooks";
import { Button, Flex, Input, List, message, Modal, Popover, Tag } from "antd";
import type { FC } from "react";
import { useCallback, useState } from "react";
import ProList from "@/components/ProList";
import { LISTEN_KEY } from "@/constants";
import { deleteGroup, insertGroup, selectGroups, updateGroup } from "@/database/group";
import type { DatabaseSchemaGroup } from "@/types/database";

const COLOR_OPTIONS = [
  "#64b5f6", "#f06292", "#81c784", "#ffb74d", "#ba68c8",
  "#e57373", "#4db6ac", "#ff8a65", "#9575cd", "#a1887f",
  "#f48fb1", "#ce93d8", "#90caf9", "#80cbc4", "#fff176",
  "#e8c47a", "#d4a373", "#7ec8e3", "#f59d8a", "#b39ddb",
];

const Groups: FC = () => {
  const [groups, setGroups] = useState<DatabaseSchemaGroup[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addColor, setAddColor] = useState(COLOR_OPTIONS[0]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await selectGroups();
      const sorted = [...list].sort((a, b) => {
        if (a.id === "_default") return -1;
        if (b.id === "_default") return 1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
      setGroups(sorted);
    } catch {}
  }, []);

  useAsyncEffect(async () => {
    await load();
  }, []);

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return message.warning("请输入名称");

    const g: DatabaseSchemaGroup = {
      id: `g_${Date.now()}`,
      name,
      color: addColor,
      sortOrder: groups.length,
      createTime: new Date().toISOString(),
    };

    try {
      await insertGroup(g);
      setGroups((prev) => [...prev, g]);
      setAddOpen(false);
      setAddName("");
      message.success(`已创建「${name}」`);
      emit(LISTEN_KEY.GROUPS_CHANGED);
    } catch {
      message.error("创建失败");
    }
  };

  // --- 排序（用 ID 定位，不依赖数组索引）---
  const handleMove = async (id: string, dir: "up" | "down") => {
    const fresh = await selectGroups();
    const sorted = [...fresh].sort((a, b) => {
      if (a.id === "_default") return -1;
      if (b.id === "_default") return 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });

    const idx = sorted.findIndex((g) => g.id === id);
    if (idx < 0) return;

    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    if (sorted[targetIdx]?.id === "_default") return;

    const cur = sorted[idx];
    const target = sorted[targetIdx];
    const curSort = cur.sortOrder ?? 0;
    const targetSort = target.sortOrder ?? 0;

    try {
      await Promise.all([
        updateGroup(cur.id, { sortOrder: targetSort }),
        updateGroup(target.id, { sortOrder: curSort }),
      ]);

      setGroups(
        [...sorted].map((g) => {
          if (g.id === cur.id) return { ...g, sortOrder: targetSort };
          if (g.id === target.id) return { ...g, sortOrder: curSort };
          return g;
        }).sort((a, b) => {
          if (a.id === "_default") return -1;
          if (b.id === "_default") return 1;
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        }),
      );
      emit(LISTEN_KEY.GROUPS_CHANGED);
    } catch {
      message.error("排序失败");
    }
  };

  // --- 重命名 ---
  const handleRename = async () => {
    if (!renameId) return;
    const name = renameName.trim();
    if (!name) return message.warning("请输入名称");

    try {
      await updateGroup(renameId, { name });
      setGroups((prev) => prev.map((g) => (g.id === renameId ? { ...g, name } : g)));
      setRenameOpen(false);
      setRenameId(null);
      message.success("已重命名");
      emit(LISTEN_KEY.GROUPS_CHANGED);
    } catch {
      message.error("重命名失败");
    }
  };

  // --- 删除 ---
  const handleDelete = (g: DatabaseSchemaGroup) => {
    Modal.confirm({
      centered: true,
      content: `删除「${g.name}」后，其中的内容将移入「默认」分类。`,
      onOk: async () => {
        try {
          await deleteGroup(g.id);
          setGroups((prev) => prev.filter((x) => x.id !== g.id));
          message.success(`已删除「${g.name}」`);
          emit(LISTEN_KEY.GROUPS_CHANGED);
        } catch {
          message.error("删除失败");
        }
      },
      okText: "确定删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
    });
  };

  return (
    <>
      <ProList header="分类管理">
        <List
          dataSource={groups}
          renderItem={(item, idx) => {
            const isDefault = item.id === "_default";
            return (
              <List.Item
                actions={
                  isDefault ? [] : [
                    <Button key="up" size="small" disabled={idx <= 1 || groups[idx - 1]?.id === "_default"} onClick={() => handleMove(item.id, "up")}>↑</Button>,
                    <Button key="down" size="small" disabled={idx >= groups.length - 1} onClick={() => handleMove(item.id, "down")}>↓</Button>,
                    <Button key="rename" size="small" onClick={() => { setRenameId(item.id); setRenameName(item.name); setRenameOpen(true); }}>
                      重命名
                    </Button>,
                    <Button key="del" size="small" danger onClick={() => handleDelete(item)}>
                      删除
                    </Button>,
                  ]
                }
              >
                <Flex align="center" gap={8}>
                  <Popover
                    trigger="click"
                    content={
                      <Flex wrap="wrap" gap={4} style={{ width: 172 }}>
                        {COLOR_OPTIONS.map((c) => (
                          <div
                            key={c}
                            onClick={async () => {
                              try {
                                await updateGroup(item.id, { color: c });
                                setGroups((prev) => prev.map((g) => (g.id === item.id ? { ...g, color: c } : g)));
                                emit(LISTEN_KEY.GROUPS_CHANGED);
                              } catch {}
                            }}
                            style={{
                              width: 20, height: 20, borderRadius: "50%",
                              backgroundColor: c, cursor: "pointer",
                              border: item.color === c ? "2px solid var(--ant-color-text)" : "2px solid transparent",
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </Flex>
                    }
                  >
                    <div
                      style={{
                        width: 10, height: 10, borderRadius: "50%",
                        backgroundColor: isDefault ? "#000" : item.color,
                        flexShrink: 0, cursor: isDefault ? "default" : "pointer",
                      }}
                    />
                  </Popover>
                  <span>{item.name}</span>
                  {isDefault && <Tag style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>预设</Tag>}
                </Flex>
              </List.Item>
            );
          }}
          footer={
            <Flex align="center" gap={8} style={{ cursor: "pointer", padding: "8px 0" }} onClick={() => { setAddName(""); setAddColor(COLOR_OPTIONS[0]); setAddOpen(true); }}>
              <span style={{ fontSize: 16, lineHeight: 1, color: "var(--ant-color-primary)" }}>+</span>
              <span style={{ color: "var(--ant-color-primary)", fontSize: 13 }}>添加新分类</span>
            </Flex>
          }
        />
      </ProList>

      {/* 新建分类弹窗 */}
      <Modal open={addOpen} onCancel={() => setAddOpen(false)} onOk={handleAdd} title="新建分类" centered okText="创建" cancelText="取消">
        <Flex vertical gap={12}>
          <Input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="输入分类名称"
            onPressEnter={handleAdd}
            maxLength={20}
            showCount
          />
          <div>
            <div style={{ fontSize: 12, color: "var(--ant-color-text-secondary)", marginBottom: 6 }}>选择颜色</div>
            <Flex wrap="wrap" gap={6}>
              {COLOR_OPTIONS.map((c) => (
                <div
                  key={c}
                  onClick={() => setAddColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: c,
                    cursor: "pointer",
                    border: addColor === c ? "2px solid var(--ant-color-text)" : "2px solid transparent",
                    transition: "border 0.15s",
                    flexShrink: 0,
                  }}
                />
              ))}
            </Flex>
          </div>
        </Flex>
      </Modal>

      {/* 重命名弹窗 */}
      <Modal open={renameOpen} onCancel={() => setRenameOpen(false)} onOk={handleRename} title="重命名" centered okText="确定" cancelText="取消">
        <Input
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          placeholder="输入新名称"
          onPressEnter={handleRename}
          maxLength={20}
          showCount
        />
      </Modal>
    </>
  );
};

export default Groups;
