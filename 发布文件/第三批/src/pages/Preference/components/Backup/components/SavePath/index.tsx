import { NodeIndexOutlined, ReloadOutlined } from "@ant-design/icons";
import { emit } from "@tauri-apps/api/event";
import { appCacheDir, appLogDir, dataDir as tauriDataDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useMount } from "ahooks";
import { Button, message, Space, Tooltip } from "antd";
import { isEqual, isString } from "es-toolkit";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { fullName, transfer } from "tauri-plugin-fs-pro-api";
import ProList from "@/components/ProList";
import ProListItem from "@/components/ProListItem";
import { LISTEN_KEY } from "@/constants";
import { globalStore } from "@/stores/global";
import {
  getSaveDatabasePath,
  getSaveDataDirName,
  getSaveDataPath,
  getSaveImagePath,
  join,
} from "@/utils/path";
import { wait } from "@/utils/shared";
import type { State } from "../..";

const SavePath: FC<{ state: State }> = (props) => {
  const { state } = props;
  const { t } = useTranslation();
  const [dataDir, setDataDir] = useState("");
  const [logDir, setLogDir] = useState("");
  const [cacheDir, setCacheDir] = useState("");

  useMount(async () => {
    setDataDir(await tauriDataDir());
    // 从 store 恢复，否则读默认值
    setLogDir(globalStore.env.logDir || await appLogDir());
    try {
      setCacheDir(globalStore.env.cacheDir || await appCacheDir());
    } catch {
      setCacheDir(globalStore.env.cacheDir || await tauriDataDir());
    }
  });

  const handleChange = async (isDefault = false) => {
    try {
      const dstDir = isDefault ? dataDir : await open({ directory: true });

      if (!isString(dstDir) || isEqualPath(dstDir)) return;

      const dstPath = join(dstDir, getSaveDataDirName());

      state.spinning = true;

      emit(LISTEN_KEY.CLOSE_DATABASE);

      await wait();

      await transfer(getSaveDataPath(), dstPath, {
        includes: [
          await fullName(getSaveImagePath()),
          await fullName(await getSaveDatabasePath()),
        ],
      });

      globalStore.env.saveDataDir = dstPath;

      emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);

      message.success(
        t("preference.data_backup.storage_settings.hints.change_success"),
      );
    } catch (error: any) {
      message.error(error);
    } finally {
      state.spinning = false;
    }
  };

  const isEqualPath = (dstDir = dataDir) => {
    const dstPath = join(dstDir, getSaveDataDirName());

    return isEqual(dstPath, getSaveDataPath());
  };

  // 通用路径选择，同时持久化到 store
  const handlePickPath = async (
    setter: (v: string) => void,
    key: "logDir" | "cacheDir",
  ) => {
    const dir = await open({ directory: true });
    if (isString(dir)) {
      setter(dir);
      globalStore.env[key] = dir;
      message.success("路径已更新");
    }
  };

  const description = (path = getSaveDataPath()) => {
    return (
      <span
        className="hover:color-primary cursor-pointer break-all transition"
        onMouseDown={() => openPath(path)}
      >
        {join(path)}
      </span>
    );
  };

  return (
    <ProList header={t("preference.data_backup.storage_settings.title")}>
      <ProListItem
        description={description()}
        title={t(
          "preference.data_backup.storage_settings.label.data_storage_path",
        )}
      >
        <Space.Compact>
          <Tooltip
            title={t(
              "preference.data_backup.storage_settings.hints.custom_path",
            )}
          >
            <Button
              icon={<NodeIndexOutlined />}
              onClick={() => handleChange()}
            />
          </Tooltip>

          <Tooltip
            title={t(
              "preference.data_backup.storage_settings.hints.default_path",
            )}
          >
            <Button
              disabled={isEqualPath()}
              icon={<ReloadOutlined />}
              onClick={() => handleChange(true)}
            />
          </Tooltip>
        </Space.Compact>
      </ProListItem>

      <ProListItem
        description={description(logDir)}
        title={t(
          "preference.data_backup.storage_settings.label.log_storage_path",
        )}
      >
        <Space.Compact>
          <Tooltip title="自定义">
            <Button
              icon={<NodeIndexOutlined />}
              onClick={() => handlePickPath(setLogDir, "logDir")}
            />
          </Tooltip>
          <Tooltip title="恢复默认">
            <Button
              icon={<ReloadOutlined />}
              onClick={async () => {
                const d = await appLogDir();
                setLogDir(d);
                globalStore.env.logDir = d;
              }}
            />
          </Tooltip>
        </Space.Compact>
      </ProListItem>

      <ProListItem
        description={description(cacheDir)}
        title="缓存路径"
      >
        <Space.Compact>
          <Tooltip title="自定义">
            <Button
              icon={<NodeIndexOutlined />}
              onClick={() => handlePickPath(setCacheDir)}
            />
          </Tooltip>
          <Tooltip title="恢复默认">
            <Button
              icon={<ReloadOutlined />}
              onClick={async () => {
                try {
                  const d = await appCacheDir();
                  setCacheDir(d);
                  globalStore.env.cacheDir = d;
                } catch {
                  const d = await tauriDataDir();
                  setCacheDir(d);
                  globalStore.env.cacheDir = d;
                }
              }}
            />
          </Tooltip>
        </Space.Compact>
      </ProListItem>
    </ProList>
  );
};

export default SavePath;
