import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { 聊天配置 } from "./config";

/**
 * 聊天持久化层。
 * 使用 Node 内置的 node:sqlite，避免引入需要本地编译的原生依赖（本机无 VS 构建工具链）。
 */

let 实例: DatabaseSync | null = null;

function 建立连接(): DatabaseSync {
  const 绝对路径 = resolve(process.cwd(), 聊天配置.数据库路径);
  mkdirSync(dirname(绝对路径), { recursive: true });

  const 库 = new DatabaseSync(绝对路径);
  库.exec("PRAGMA journal_mode = WAL;");
  库.exec("PRAGMA foreign_keys = ON;");
  库.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      emotion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_user_created
      ON messages(user_id, created_at);
  `);
  return 库;
}

export function 获取数据库(): DatabaseSync {
  if (实例 === null) 实例 = 建立连接();
  return 实例;
}

export interface 消息行 {
  id: number;
  role: "user" | "assistant";
  content: string;
  emotion: string | null;
  created_at: string;
}

export function 追加消息(
  用户id: number,
  角色: "user" | "assistant",
  内容: string,
  情绪: string | null = null,
): number {
  const 结果 = 获取数据库()
    .prepare(
      "INSERT INTO messages (user_id, role, content, emotion) VALUES (?, ?, ?, ?)",
    )
    .run(用户id, 角色, 内容, 情绪);
  return Number(结果.lastInsertRowid);
}

export function 读取历史(用户id: number, 条数: number): 消息行[] {
  return 获取数据库()
    .prepare(
      `SELECT id, role, content, emotion, created_at FROM messages
       WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(用户id, 条数)
    .reverse() as unknown as 消息行[];
}

export function 清空历史(用户id: number): void {
  获取数据库().prepare("DELETE FROM messages WHERE user_id = ?").run(用户id);
}

export interface 用户行 {
  id: number;
  username: string;
  password_hash: string;
}

export function 创建用户(昵称: string, 口令摘要: string): number {
  const 结果 = 获取数据库()
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(昵称, 口令摘要);
  return Number(结果.lastInsertRowid);
}

export function 按昵称查用户(昵称: string): 用户行 | undefined {
  return 获取数据库()
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(昵称) as 用户行 | undefined;
}

/** SQLite 的唯一约束冲突；用它区分“昵称重复”与其它故障 */
export function 是否唯一约束冲突(错误: unknown): boolean {
  return (
    错误 instanceof Error &&
    错误.message.includes("UNIQUE constraint failed")
  );
}
