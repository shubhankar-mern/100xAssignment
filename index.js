require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { initializeWebSocket } = require('./sockets/index.js');
const { connectDB } = require("./config/db.js");
const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index_opai.html'));
});

app.use('/api', require('./routes'));

const websocketServer = initializeWebSocket(server);

server.listen(PORT, async() => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
});

module.exports = { app, server, websocketServer };