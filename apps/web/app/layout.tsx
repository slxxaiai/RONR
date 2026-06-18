import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "RONR AI 议事",
  description: "面向个人决策的多 AI Agent 议事系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
