import { Flex } from "antd";
import { useSnapshot } from "valtio";
import UnoIcon from "@/components/UnoIcon";
import { showWindow } from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import GroupList from "../GroupList";
import HistoryList from "../HistoryList";
import SearchInput from "../SearchInput";
import WindowPin from "../WindowPin";

const StandardMode = () => {
  const { search } = useSnapshot(clipboardStore);
  const isTop = search.position === "top";

  return (
    <div
      className="cute-window"
      data-tauri-drag-region
    >
      {/* 标题栏 */}
      <div className="cute-header" data-tauri-drag-region>
        <div className="cute-header-left">
          <UnoIcon
            name="i-lets-icons:clipboard"
            style={{ fontSize: 18, color: "var(--ant-color-primary)" }}
          />
          <span>萌宝剪贴板 v5</span>
        </div>

        <div className="cute-header-right" data-tauri-drag-region>
          <WindowPin />

          <UnoIcon
            hoverable
            name="i-lets-icons:setting-alt-line"
            onClick={() => {
              showWindow("preference");
            }}
            style={{ fontSize: 18 }}
          />
        </div>
      </div>

      {/* 搜索框 — 顶部 */}
      {isTop && <SearchInput />}

      {/* 分组标签 */}
      <GroupList />

      {/* 历史列表 */}
      <Flex
        className="flex-1 overflow-hidden"
        data-tauri-drag-region
        vertical
        style={{ padding: "0 12px 8px" }}
      >
        <HistoryList />
      </Flex>

      {/* 搜索框 — 底部 */}
      {!isTop && <SearchInput />}
    </div>
  );
};

export default StandardMode;
