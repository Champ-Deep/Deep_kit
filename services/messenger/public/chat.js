// DeepKit Messenger — Web Chat UI
// Functionality-first implementation (CRT theme applied later)

const API_BASE = window.location.origin;
const HEALTH_ENDPOINT = `${API_BASE}/health`;
const CHAT_ENDPOINT = `${API_BASE}/api/chat`;

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const toolLog = document.getElementById('tool-log');

// Status indicators
const statusPostgres = document.getElementById('status-postgres');
const statusOllama = document.getElementById('status-ollama');
const statusN8n = document.getElementById('status-n8n');
const statusAgent = document.getElementById('status-agent');

// Footer stats
const uptimeEl = document.getElementById('uptime');
const requestCountEl = document.getElementById('request-count');
const memoryUsageEl = document.getElementById('memory-usage');
const taskCountEl = document.getElementById('task-count');

// State
let conversationHistory = [];
let isProcessing = false;

// Load conversation history from localStorage
function loadHistory() {
  const saved = localStorage.getItem('deepkit-chat-history');
  if (saved) {
    try {
      conversationHistory = JSON.parse(saved);
      conversationHistory.forEach(msg => displayMessage(msg, false));
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }
}

// Save conversation history to localStorage
function saveHistory() {
  try {
    localStorage.setItem('deepkit-chat-history', JSON.stringify(conversationHistory));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

// Display message in chat history
function displayMessage(message, scrollToBottom = true) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${message.role}`;

  const header = document.createElement('div');
  header.className = 'message-header';

  const role = document.createElement('span');
  role.className = `message-role ${message.role}`;
  role.textContent = message.role === 'user' ? 'You' : 'Agent';

  const timestamp = document.createElement('span');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = new Date(message.timestamp).toLocaleTimeString();

  header.appendChild(role);
  header.appendChild(timestamp);

  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = message.content;

  messageDiv.appendChild(header);
  messageDiv.appendChild(content);

  // Add metadata if available
  if (message.metadata) {
    const meta = document.createElement('div');
    meta.className = 'message-metadata';
    const parts = [];
    if (message.metadata.duration) parts.push(`${message.metadata.duration}`);
    if (message.metadata.tool_used) parts.push(`Tool: ${message.metadata.tool_used}`);
    meta.textContent = parts.join(' • ');
    messageDiv.appendChild(meta);
  }

  chatHistory.appendChild(messageDiv);

  if (scrollToBottom) {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

// Log tool execution
function logToolExecution(toolName, args, result, duration) {
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry log-tool';

  const timestamp = new Date().toLocaleTimeString();
  const argsStr = args ? JSON.stringify(args) : '{}';

  logEntry.innerHTML = `
    <strong>Tool:</strong> ${toolName}
    <br><strong>Args:</strong> ${argsStr}
    <br><strong>Result:</strong> ${result ? 'success' : 'error'}
    <span class="log-timestamp">${timestamp} • ${duration}</span>
  `;

  toolLog.appendChild(logEntry);
  toolLog.scrollTop = toolLog.scrollHeight;
}

// Log info message
function logInfo(message) {
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry log-info';
  logEntry.innerHTML = `${message}<span class="log-timestamp">${new Date().toLocaleTimeString()}</span>`;
  toolLog.appendChild(logEntry);
  toolLog.scrollTop = toolLog.scrollHeight;
}

// Log error
function logError(message) {
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry log-error';
  logEntry.innerHTML = `<strong>Error:</strong> ${message}<span class="log-timestamp">${new Date().toLocaleTimeString()}</span>`;
  toolLog.appendChild(logEntry);
  toolLog.scrollTop = toolLog.scrollHeight;
}

// Send message to agent
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isProcessing) return;

  isProcessing = true;
  sendButton.disabled = true;
  messageInput.value = '';

  // Display user message
  const userMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };
  conversationHistory.push(userMessage);
  displayMessage(userMessage);
  saveHistory();

  logInfo(`Sending message: "${message}"`);

  try {
    const startTime = Date.now();
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        from: 'web-ui'
      })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Display agent response
    const agentMessage = {
      role: 'agent',
      content: data.response || 'No response',
      timestamp: new Date().toISOString(),
      metadata: {
        duration: data.metadata?.duration || `${duration}ms`,
        tool_used: data.metadata?.tool_used || null
      }
    };
    conversationHistory.push(agentMessage);
    displayMessage(agentMessage);
    saveHistory();

    // Log tool execution if available
    if (data.metadata?.tool_used) {
      logToolExecution(
        data.metadata.tool_used,
        data.metadata.tool_args || {},
        data.success,
        data.metadata.duration
      );
    } else {
      logInfo(`LLM chat response (${agentMessage.metadata.duration})`);
    }

  } catch (error) {
    console.error('Send error:', error);
    logError(error.message);

    const errorMessage = {
      role: 'agent',
      content: `Error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
    conversationHistory.push(errorMessage);
    displayMessage(errorMessage);
    saveHistory();
  } finally {
    isProcessing = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

// Update service status dashboard
async function updateStatus() {
  try {
    const response = await fetch(HEALTH_ENDPOINT);
    if (!response.ok) throw new Error('Health check failed');

    const data = await response.json();

    // Update status indicators
    updateIndicator(statusPostgres, data.connections?.postgres);
    updateIndicator(statusOllama, data.connections?.ollama);
    updateIndicator(statusN8n, data.connections?.n8n);
    updateIndicator(statusAgent, data.agentCore === 'enabled');

    // Update footer stats
    uptimeEl.textContent = formatUptime(data.uptime);
    requestCountEl.textContent = data.metrics?.requests?.total || '0';
    memoryUsageEl.textContent = `${data.metrics?.memory?.used || 0}MB / ${data.metrics?.memory?.total || 0}MB`;
    taskCountEl.textContent = data.storage?.stats?.task_count || '0';

  } catch (error) {
    console.error('Status update error:', error);
    // Set all to offline
    updateIndicator(statusPostgres, false);
    updateIndicator(statusOllama, false);
    updateIndicator(statusN8n, false);
    updateIndicator(statusAgent, false);
  }
}

// Update status indicator
function updateIndicator(element, isOnline) {
  const indicator = element.querySelector('.status-indicator');
  indicator.classList.remove('online', 'offline', 'degraded');
  if (isOnline === true) {
    indicator.textContent = '●';
    indicator.classList.add('online');
  } else if (isOnline === false) {
    indicator.textContent = '○';
    indicator.classList.add('offline');
  } else {
    indicator.textContent = '◐';
    indicator.classList.add('degraded');
  }
}

// Format uptime (seconds → human readable)
function formatUptime(seconds) {
  if (!seconds) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

// Clear conversation history
function clearHistory() {
  if (confirm('Clear all conversation history?')) {
    conversationHistory = [];
    localStorage.removeItem('deepkit-chat-history');
    chatHistory.innerHTML = '<div class="welcome-message">Conversation history cleared. Type a message to start fresh.</div>';
    logInfo('Conversation history cleared');
  }
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Keyboard shortcut: Ctrl+L to clear history
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    clearHistory();
  }
});

// Initialize
loadHistory();
updateStatus();

// Poll health status every 10 seconds
setInterval(updateStatus, 10000);

// Remove welcome message on first interaction
messageInput.addEventListener('focus', () => {
  const welcome = chatHistory.querySelector('.welcome-message');
  if (welcome && conversationHistory.length === 0) {
    welcome.style.opacity = '0.5';
  }
});

console.log('DeepKit Messenger Web UI loaded');
logInfo('Web UI initialized. Ready to chat.');
