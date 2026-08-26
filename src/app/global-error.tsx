"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected application error", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body style={styles.body}>
        <title>页面暂时无法加载 — zihAI</title>
        <main role="alert" style={styles.card}>
          <span aria-hidden="true" style={styles.icon}>
            !
          </span>
          <h1 style={styles.title}>页面暂时无法加载</h1>
          <p style={styles.description}>
            系统遇到了临时问题，请稍后重试，或者重新打开当前页面。
          </p>
          <button type="button" style={styles.button} onClick={retry}>
            重试
          </button>
        </main>
      </body>
    </html>
  );
}

const styles = {
  body: {
    alignItems: "center",
    background:
      "radial-gradient(circle at 12% -8%, rgb(217 255 103 / 22%), transparent 24rem), radial-gradient(circle at 92% 2%, rgb(109 67 242 / 12%), transparent 28rem), #f7f8f4",
    color: "#161a16",
    display: "flex",
    fontFamily: 'Inter, "SF Pro Text", "Segoe UI", sans-serif',
    justifyContent: "center",
    margin: 0,
    minHeight: "100vh",
    padding: "1rem",
  },
  card: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    maxWidth: "32rem",
    textAlign: "center",
  },
  icon: {
    alignItems: "center",
    background: "#fff1f2",
    borderRadius: "1rem",
    color: "#c63d4f",
    display: "flex",
    fontSize: "1.5rem",
    fontWeight: 800,
    height: "3.75rem",
    justifyContent: "center",
    width: "3.75rem",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: 900,
    letterSpacing: "-0.025em",
    margin: "1.25rem 0 0",
  },
  description: {
    color: "#697069",
    fontSize: "0.875rem",
    lineHeight: 1.7,
    margin: "0.75rem 0 0",
  },
  button: {
    background: "#6d43f2",
    border: 0,
    borderRadius: "0.9rem",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 700,
    marginTop: "1.5rem",
    padding: "0.75rem 1.25rem",
  },
} as const;
