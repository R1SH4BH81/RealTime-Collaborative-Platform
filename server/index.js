const { WebSocket, WebSocketServer } = require("ws");
const http = require("http");
const uuidv4 = require("uuid").v4;

// Use Render's assigned port in production
const PORT = process.env.PORT || 8000;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server is running ✅");
});

// Attach WebSocket server to the HTTP server
const wsServer = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`WebSocket + HTTP server running on port ${PORT}`);
});

// Store active connections and users
const clients = {};
const users = {};
let editorContent = null;
let userActivity = [];

// Event types
const typesDef = {
  USER_EVENT: "userevent",
  CONTENT_CHANGE: "contentchange",
};

function broadcastMessage(json) {
  const data = JSON.stringify(json);
  for (let userId in clients) {
    let client = clients[userId];
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function handleMessage(message, userId) {
  const dataFromClient = JSON.parse(message.toString());
  const json = { type: dataFromClient.type };

  if (dataFromClient.type === typesDef.USER_EVENT) {
    users[userId] = dataFromClient;
    userActivity.push(`${dataFromClient.username} joined to edit the document`);
    json.data = { users, userActivity };
  } else if (dataFromClient.type === typesDef.CONTENT_CHANGE) {
    editorContent = dataFromClient.content;
    json.data = { editorContent, userActivity };
  }

  broadcastMessage(json);
}

function handleDisconnect(userId) {
  console.log(`${userId} disconnected.`);
  const json = { type: typesDef.USER_EVENT };
  const username = users[userId]?.username || userId;
  userActivity.push(`${username} left the document`);
  json.data = { users, userActivity };
  delete clients[userId];
  delete users[userId];
  broadcastMessage(json);
}

// WebSocket connection handling
wsServer.on("connection", (connection) => {
  const userId = uuidv4();
  console.log("Received a new connection");
  clients[userId] = connection;
  console.log(`${userId} connected.`);

  connection.on("message", (message) => handleMessage(message, userId));
  connection.on("close", () => handleDisconnect(userId));
});
