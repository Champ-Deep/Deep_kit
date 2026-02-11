import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.env.HOME || '/root', '.deepkit');
const DB_PATH = path.join(DB_DIR, 'brain.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tool_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER REFERENCES conversations(id),
    tool_name TEXT NOT NULL,
    method TEXT NOT NULL,
    params TEXT,
    response TEXT,
    success BOOLEAN,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export const createConversation = (): number => {
  const stmt = db.prepare('INSERT INTO conversations DEFAULT VALUES');
  const result = stmt.run();
  return result.lastInsertRowid as number;
};

export const addMessage = (conversationId: number, role: string, content: string | any, toolCalls?: any) => {
  const stmt = db.prepare(
    'INSERT INTO messages (conversation_id, role, content, tool_calls) VALUES (?, ?, ?, ?)'
  );
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  stmt.run(conversationId, role, contentStr, toolCalls ? JSON.stringify(toolCalls) : null);
};

export const getConversationMessages = (conversationId: number) => {
  const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp');
  return stmt.all(conversationId);
};

export const logToolCall = (conversationId: number, toolName: string, method: string, params: any, response: any, success: boolean) => {
  const stmt = db.prepare(
    'INSERT INTO tool_calls (conversation_id, tool_name, method, params, response, success) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(conversationId, toolName, method, JSON.stringify(params), JSON.stringify(response), success ? 1 : 0);
};

export default db;
