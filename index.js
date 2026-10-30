require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { initializeWebSocket } = require('./sockets/index.js');
const { connectDB } = require("./config/db.js");

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index_opai.html'));
});

app.use('/api', require('./routes'));

const websocketServer = initializeWebSocket(server);

server.listen(3000, async() => {
  console.log('Server is running on port 3000');
  await connectDB();
});

module.exports = { app, server, websocketServer };