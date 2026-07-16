import { getVersion } from "@tauri-apps/api/app";
import { Avatar, Flex, Tag, Typography } from "antd";
import { useMount } from "ahooks";
import { useState } from "react";

const { Text } = Typography;

const About = () => {
  const [version, setVersion] = useState("");

  const features = [
    "自定义分类管理",
    "内容自由排序",
    "6 种可爱主题",
    "双击自动粘贴",
    "右键快速分类",
  ];

  useMount(async () => {
    setVersion(await getVersion());
  });

  return (
    <>
      {/* 应用信息卡片 */}
      <Flex align="center" justify="center" style={{ padding: "32px 0 16px" }} vertical>
        <Avatar
          shape="square"
          size={72}
          src="/logo.png"
          style={{ borderRadius: 16, marginBottom: 12 }}
        />

        <Text style={{ fontSize: 20, fontWeight: 700, color: "var(--ant-color-text)", marginBottom: 2 }}>
          萌宝剪贴板
        </Text>

        <Text type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
          v{version} · 可可爱爱的跨平台剪贴板管理工具
        </Text>

        <div
          style={{
            width: 40, height: 2, borderRadius: 1,
            background: "var(--ant-color-border-secondary)",
            marginBottom: 20,
          }}
        />

        {/* 功能亮点 */}
        <Flex wrap="wrap" gap={8} justify="center" style={{ maxWidth: 320, marginBottom: 16 }}>
          {features.map((f) => (
            <Tag key={f} color="var(--ant-color-primary)" style={{ borderRadius: 12, margin: 0 }}>
              {f}
            </Tag>
          ))}
        </Flex>

        {/* 技术栈 */}
        <Text type="secondary" style={{ fontSize: 11, marginBottom: 16 }}>
          🛠 Tauri v2 · React · TypeScript · SQLite
        </Text>

        {/* 许可证 */}
        <Text type="secondary" style={{ fontSize: 11 }}>
          📜 Apache 2.0 License
        </Text>
      </Flex>

      {/* 作者区域 */}
      <Flex vertical align="center" style={{ paddingBottom: 24 }}>
        <div style={{ width: 40, height: 2, borderRadius: 1, background: "var(--ant-color-border-secondary)", marginBottom: 16 }} />
        <Avatar
          size={48}
          src="/author-logo.jpg"
          style={{ marginBottom: 8, border: "2px solid var(--ant-color-primary)" }}
        />
        <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>由</Text>
          <Text style={{ fontSize: 16, fontWeight: 600, color: "var(--ant-color-primary)" }}>
            𝓡𝓾𝓲𝔃𝔃
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>精心打造 💕</Text>
        </Flex>
        <Text type="secondary" style={{ fontSize: 12 }}>
          希望它能给你带来便捷与好心情 ✨
        </Text>
      </Flex>
    </>
  );
};

export default About;
