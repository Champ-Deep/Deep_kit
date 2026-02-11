"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToolCall = exports.getConversationMessages = exports.addMessage = exports.createConversation = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_DIR = path_1.default.join(process.env.HOME || '/root', '.deepkit');
const DB_PATH = path_1.default.join(DB_DIR, 'brain.db');
if (!fs_1.default.existsSync(DB_DIR)) {
    fs_1.default.mkdirSync(DB_DIR, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
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
const createConversation = () => {
    const stmt = db.prepare('INSERT INTO conversations DEFAULT VALUES');
    const result = stmt.run();
    return result.lastInsertRowid;
};
exports.createConversation = createConversation;
const addMessage = (conversationId, role, content, toolCalls) => {
    const stmt = db.prepare('INSERT INTO messages (conversation_id, role, content, tool_calls) VALUES (?, ?, ?, ?)');
    stmt.run(conversationId, role, content, toolCalls ? JSON.stringify(toolCalls) : null);
};
exports.addMessage = addMessage;
const getConversationMessages = (conversationId) => {
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp');
    return stmt.all(conversationId);
};
exports.getConversationMessages = getConversationMessages;
const logToolCall = (conversationId, toolName, method, params, response, success) => {
    const stmt = db.prepare('INSERT INTO tool_calls (conversation_id, tool_name, method, params, response, success) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(conversationId, toolName, method, JSON.stringify(params), JSON.stringify(response), success);
};
exports.logToolCall = logToolCall;
exports.default = db;
