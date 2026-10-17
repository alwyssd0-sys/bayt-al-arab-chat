const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/bayt-chat';

// Mongoose models
const messageSchema = new mongoose.Schema({
  room: String,
  username: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => res.send('Bayt Chat Backend'));

// Get recent messages for a room
app.get('/rooms/:room/messages', async (req, res) => {
  const room = req.params.room;
  const limit = parseInt(req.query.limit || '50');
  try {
    const msgs = await Message.find({ room }).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(msgs.reverse());
  } catch (e) {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    socket.to(room).emit('system', { text: 'A user joined the room.' });
  });

  socket.on('message', async (payload) => {
    // payload: { room, username, text }
    const msg = new Message({ room: payload.room, username: payload.username, text: payload.text });
    await msg.save();
    io.to(payload.room).emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected:', socket.id);
  });
});

server.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
