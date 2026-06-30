"use client";

import styles from "./auth.module.scss";
import { IconButton } from "./button";
import { PasswordInput } from "./ui-lib";
import { useState, useEffect } from "react";
import BotIcon from "../icons/bot.svg";

const TOKEN_KEY = "nextchat-user-token";

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        onLogin(data.token);
      } else {
        setError(data.message || "登录失败");
      }
    } catch (e) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["auth-page"]}>
      <div className={styles["auth-logo"]}>
        <BotIcon />
      </div>
      <div className={styles["auth-title"]}>登录</div>
      <div className={styles["auth-tips"]}>请输入用户名和密码</div>

      <input
        className={styles["auth-input"]}
        style={{
          marginTop: "3vh",
          padding: "10px 16px",
          width: "80%",
          maxWidth: "300px",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
          background: "var(--input-bg)",
          color: "var(--text-color)",
          fontSize: "16px",
          outline: "none",
        }}
        type="text"
        placeholder="用户名"
        value={username}
        onChange={(e) => setUsername(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />

      <PasswordInput
        style={{
          marginTop: "2vh",
          marginBottom: "2vh",
          width: "80%",
          maxWidth: "300px",
        }}
        value={password}
        type="password"
        placeholder="密码"
        onChange={(e) => setPassword(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />

      {error && (
        <div style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      <div className={styles["auth-actions"]}>
        <IconButton
          text={loading ? "登录中..." : "登录"}
          type="primary"
          onClick={handleLogin}
          disabled={loading}
        />
      </div>
    </div>
  );
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
