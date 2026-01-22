const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const WORD_CATEGORIES = {
  mix: ["苹果", "香蕉", "汽车", "房子", "电脑", "猫", "狗", "太阳", "月亮", "树", "飞机", "火箭", "汉堡", "吉他", "足球"],
  animals: ["熊猫", "企鹅", "长颈鹿", "大象", "狮子", "老虎", "兔子", "乌龟", "恐龙", "袋鼠", "考拉", "章鱼"],
  food: ["火锅", "寿司", "烤鸭", "奶茶", "饺子", "拉面", "炸鸡", "蛋糕", "甜甜圈", "咖啡", "可乐"],
  items: ["手机", "眼镜", "牙刷", "雨伞", "背包", "手表", "耳机", "台灯", "剪刀", "钥匙", "钱包"]
};

const rooms = {};
const ROUND_TIME = 60; 

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', ({ room, username, category = 'mix' }) => {
    socket.join(room);
    
    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        currentDrawer: null,
        currentWord: null,
        isPlaying: false,
        category: category,
        roundTime: ROUND_TIME,
        timerInterval: null,
        turnCount: 0 // 记录当前是第几轮
      };
    }

    const existingPlayer = rooms[room].players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      rooms[room].players.push({ 
        id: socket.id, 
        username, 
        avatarSeed: Math.random().toString(36).substring(7), // 随机种子用于头像
        score: 0 
      });
    }

    io.to(room).emit('update_players', rooms[room].players);
    io.to(room).emit('room_config', { category: rooms[room].category });
    
    if (rooms[room].isPlaying) {
      socket.emit('game_state_sync', {
        isPlaying: true,
        currentDrawer: rooms[room].currentDrawer,
        roundTime: rooms[room].roundTime
      });
    }
  });

  socket.on('change_category', ({ room, category }) => {
    if (rooms[room]) {
      rooms[room].category = category;
      io.to(room).emit('room_config', { category });
    }
  });

  socket.on('start_game', (room) => {
    const roomData = rooms[room];
    if (!roomData || roomData.players.length < 2) return;

    roomData.isPlaying = true;
    roomData.turnCount = 0; // 重置轮数
    // 重置分数
    roomData.players.forEach(p => p.score = 0);
    io.to(room).emit('update_players', roomData.players);

    startNewRound(room);
  });

  socket.on('draw_data', (data) => {
    const roomData = rooms[data.room];
    if (roomData && roomData.currentDrawer === socket.id) {
      socket.to(data.room).emit('draw_data', data);
    }
  });

  socket.on('fill_canvas', (data) => {
    const roomData = rooms[data.room];
    if (roomData && roomData.currentDrawer === socket.id) {
      socket.to(data.room).emit('fill_canvas', data);
    }
  });

  socket.on('clear_canvas', (room) => {
    const roomData = rooms[room];
    if (roomData && roomData.currentDrawer === socket.id) {
      socket.to(room).emit('clear_canvas');
    }
  });

  socket.on('restart_game', (room) => {
     // 简单的重置并重新开始
     const roomData = rooms[room];
     if(roomData) {
         roomData.turnCount = 0;
         roomData.players.forEach(p => p.score = 0);
         io.to(room).emit('update_players', roomData.players);
         startNewRound(room);
     }
  });

  socket.on('send_message', (data) => {
    const { room, message, author } = data;
    const roomData = rooms[room];

    if (roomData && roomData.isPlaying && roomData.currentWord) {
      if (message.trim() === roomData.currentWord) {
        if (socket.id !== roomData.currentDrawer) {
          handleCorrectGuess(room, socket.id, author);
          return;
        }
      }
    }

    socket.to(room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

function handleCorrectGuess(room, winnerId, winnerName) {
  const roomData = rooms[room];
  if (!roomData) return;

  clearInterval(roomData.timerInterval);

  const player = roomData.players.find(p => p.id === winnerId);
  const drawer = roomData.players.find(p => p.id === roomData.currentDrawer);
  
  if (player) player.score += Math.max(10, Math.ceil(roomData.roundTime / 2));
  if (drawer) drawer.score += 5;

  io.to(room).emit('receive_message', {
    room,
    author: "系统",
    message: `🎉 ${winnerName} 答对了！答案是：${roomData.currentWord}`,
    isSystem: true,
    type: 'success'
  });

  io.to(room).emit('update_players', roomData.players);
  
  const effectType = Math.floor(Math.random() * 3) + 1;
  io.to(room).emit('correct_guess', { winner: winnerName, effectType });

  setTimeout(() => {
    startNewRound(room);
  }, 3000);
}

function startNewRound(room) {
  const roomData = rooms[room];
  if (!roomData || roomData.players.length === 0) return;

  // 检查游戏是否结束 (每人画过一轮)
  // 简单逻辑：turnCount 达到 players.length
  if (roomData.turnCount >= roomData.players.length) {
      endGame(room);
      return;
  }

  // 轮换画家 (按顺序)
  const drawerIndex = roomData.turnCount % roomData.players.length;
  const nextDrawer = roomData.players[drawerIndex];
  
  roomData.currentDrawer = nextDrawer.id;
  roomData.turnCount++;

  const categoryList = WORD_CATEGORIES[roomData.category] || WORD_CATEGORIES.mix;
  const word = categoryList[Math.floor(Math.random() * categoryList.length)];
  roomData.currentWord = word;

  roomData.roundTime = ROUND_TIME;
  if (roomData.timerInterval) clearInterval(roomData.timerInterval);

  io.to(room).emit('clear_canvas');
  io.to(room).emit('new_round', {
    drawer: nextDrawer.username,
    drawerId: nextDrawer.id,
    roundTime: ROUND_TIME,
    turnCurrent: roomData.turnCount,
    turnTotal: roomData.players.length
  });
  io.to(nextDrawer.id).emit('your_turn', word);

  roomData.timerInterval = setInterval(() => {
    roomData.roundTime--;
    io.to(room).emit('timer_update', roomData.roundTime);

    if (roomData.roundTime <= 0) {
      clearInterval(roomData.timerInterval);
      io.to(room).emit('receive_message', {
        room,
        author: "系统",
        message: `⏰ 时间到！答案是：${roomData.currentWord}`,
        isSystem: true,
        type: 'error'
      });
      setTimeout(() => startNewRound(room), 3000);
    }
  }, 1000);
}

function endGame(room) {
    const roomData = rooms[room];
    roomData.isPlaying = false;
    clearInterval(roomData.timerInterval);
    
    // 排序玩家
    const sortedPlayers = [...roomData.players].sort((a, b) => b.score - a.score);
    
    io.to(room).emit('game_over', {
        leaderboard: sortedPlayers
    });
}

function handleDisconnect(socket) {
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const index = room.players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      room.players.splice(index, 1);
      io.to(roomCode).emit('update_players', room.players);
      
      if (room.players.length === 0) {
        clearInterval(room.timerInterval);
        delete rooms[roomCode];
      } else if (room.currentDrawer === socket.id) {
        clearInterval(room.timerInterval);
        io.to(roomCode).emit('receive_message', {
          room: roomCode, author: "系统", message: "画家断线了，跳过本轮！", isSystem: true
        });
        startNewRound(roomCode);
      }
      break;
    }
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
