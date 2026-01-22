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

// 游戏模式配置
const GAME_MODES = {
  classic: {
    name: "经典模式",
    roundTime: 60,
    guessScore: (timeLeft) => Math.max(10, Math.ceil(timeLeft / 2)),
    drawerScore: 5
  },
  lightning: {
    name: "闪电模式",
    roundTime: 30,
    guessScore: (timeLeft) => Math.max(20, Math.ceil(timeLeft)),
    drawerScore: 10
  },
  combo: {
    name: "连击模式",
    roundTime: 60,
    guessScore: (timeLeft, comboMultiplier = 1) => Math.max(10, Math.ceil(timeLeft / 2)) * comboMultiplier,
    drawerScore: 5
  },
  relay: {
    name: "接力模式",
    roundTime: 30, // 每人30秒 (原15秒)
    relayPlayers: 3, // 3个人接力
    guessScore: (timeLeft) => Math.max(15, Math.ceil(timeLeft * 2)),
    drawerScore: 3 // 每个接力画家得分
  }
};

const rooms = {};
const ROUND_TIME = 60; 

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', ({ room, username, category = 'mix', gameMode = 'classic' }) => {
    socket.join(room);
    
    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        currentDrawer: null,
        currentWord: null,
        isPlaying: false,
        category: category,
        gameMode: gameMode,
        roundTime: GAME_MODES[gameMode].roundTime,
        timerInterval: null,
        turnCount: 0, // 记录当前是第几轮
        // 接力模式专用
        relayDrawers: [], // 接力画家队列
        relayIndex: 0, // 当前接力到第几个人
        // 连击模式专用
        playerCombos: {} // 记录每个玩家的连击数
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
      // 初始化连击数
      if (rooms[room].gameMode === 'combo') {
        rooms[room].playerCombos[socket.id] = 0;
      }
    }

    io.to(room).emit('update_players', rooms[room].players);
    io.to(room).emit('room_config', { 
      category: rooms[room].category,
      gameMode: rooms[room].gameMode 
    });
    
    if (rooms[room].isPlaying) {
      socket.emit('game_state_sync', {
        isPlaying: true,
        currentDrawer: rooms[room].currentDrawer,
        roundTime: rooms[room].roundTime,
        gameMode: rooms[room].gameMode
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
    if (roomData) {
      // 接力模式：检查是否在接力画家队列中
      if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('draw_data', data);
        }
      } else {
        // 普通模式：检查是否是当前画家
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('draw_data', data);
        }
      }
    }
  });

  socket.on('fill_canvas', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      // 接力模式：检查是否在接力画家队列中
      if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('fill_canvas', data);
        }
      } else {
        // 普通模式：检查是否是当前画家
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('fill_canvas', data);
        }
      }
    }
  });

  socket.on('clear_canvas', (room) => {
    const roomData = rooms[room];
    if (roomData) {
      // 接力模式：检查是否在接力画家队列中
      if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(room).emit('clear_canvas');
        }
      } else {
        // 普通模式：检查是否是当前画家
        if (roomData.currentDrawer === socket.id) {
          socket.to(room).emit('clear_canvas');
        }
      }
    }
  });

  socket.on('restart_game', (room) => {
     // 简单的重置并重新开始
     const roomData = rooms[room];
     if(roomData) {
         roomData.turnCount = 0;
         roomData.players.forEach(p => p.score = 0);
         // 重置连击数
         if (roomData.gameMode === 'combo') {
           Object.keys(roomData.playerCombos).forEach(playerId => {
             roomData.playerCombos[playerId] = 0;
           });
         }
         // 重置接力数据
         if (roomData.gameMode === 'relay') {
           roomData.relayDrawers = [];
           roomData.relayIndex = 0;
         }
         io.to(room).emit('update_players', roomData.players);
         startNewRound(room);
     }
  });

  socket.on('send_message', (data) => {
    const { room, message, author } = data;
    const roomData = rooms[room];

    if (roomData && roomData.isPlaying && roomData.currentWord) {
      if (message.trim() === roomData.currentWord) {
        // 接力模式：接力画家不能猜
        if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
          if (!roomData.relayDrawers.includes(socket.id)) {
            handleCorrectGuess(room, socket.id, author);
            return;
          }
        } else {
          // 普通模式：画家不能猜
          if (socket.id !== roomData.currentDrawer) {
            handleCorrectGuess(room, socket.id, author);
            return;
          }
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
  const modeConfig = GAME_MODES[roomData.gameMode];
  
  // 连击模式：增加连击数
  if (roomData.gameMode === 'combo') {
    roomData.playerCombos[winnerId] = (roomData.playerCombos[winnerId] || 0) + 1;
    const comboMultiplier = Math.min(roomData.playerCombos[winnerId], 5); // 最高5倍
    const guessScore = modeConfig.guessScore(roomData.roundTime, comboMultiplier);
    
    if (player) player.score += guessScore;
    
    // 给所有画家加分
    if (roomData.gameMode === 'relay' && roomData.relayDrawers.length > 0) {
      roomData.relayDrawers.forEach(drawerId => {
        const drawer = roomData.players.find(p => p.id === drawerId);
        if (drawer) drawer.score += modeConfig.drawerScore;
      });
    } else {
      const drawer = roomData.players.find(p => p.id === roomData.currentDrawer);
      if (drawer) drawer.score += modeConfig.drawerScore;
    }
    
    io.to(room).emit('receive_message', {
      room,
      author: "系统",
      message: `🎉 ${winnerName} 答对了！答案是：${roomData.currentWord} (${comboMultiplier}x 连击!)`,
      isSystem: true,
      type: 'success'
    });
    
    // 发送连击更新
    io.to(room).emit('combo_update', {
      playerId: winnerId,
      combo: comboMultiplier
    });
    
  } else {
    // 其他模式
    const guessScore = modeConfig.guessScore(roomData.roundTime);
    if (player) player.score += guessScore;
    
    // 给所有接力画家加分
    if (roomData.gameMode === 'relay' && roomData.relayDrawers.length > 0) {
      roomData.relayDrawers.forEach(drawerId => {
        const drawer = roomData.players.find(p => p.id === drawerId);
        if (drawer) drawer.score += modeConfig.drawerScore;
      });
    } else {
      const drawer = roomData.players.find(p => p.id === roomData.currentDrawer);
      if (drawer) drawer.score += modeConfig.drawerScore;
    }
    
    io.to(room).emit('receive_message', {
      room,
      author: "系统",
      message: `🎉 ${winnerName} 答对了！答案是：${roomData.currentWord}`,
      isSystem: true,
      type: 'success'
    });
  }

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

  const modeConfig = GAME_MODES[roomData.gameMode];

  // 检查游戏是否结束
  if (roomData.gameMode === 'relay') {
    // 接力模式：每组接力算一轮，总轮数为玩家数
    if (roomData.turnCount >= roomData.players.length) {
      endGame(room);
      return;
    }
  } else {
    // 其他模式：每人画过一轮
    if (roomData.turnCount >= roomData.players.length) {
      endGame(room);
      return;
    }
  }

  // 接力模式特殊处理
  if (roomData.gameMode === 'relay') {
    startRelayRound(room);
  } else {
    startNormalRound(room);
  }
}

// 普通模式的回合
function startNormalRound(room) {
  const roomData = rooms[room];
  const modeConfig = GAME_MODES[roomData.gameMode];
  
  // 轮换画家 (按顺序)
  const drawerIndex = roomData.turnCount % roomData.players.length;
  const nextDrawer = roomData.players[drawerIndex];
  
  roomData.currentDrawer = nextDrawer.id;
  roomData.turnCount++;

  const categoryList = WORD_CATEGORIES[roomData.category] || WORD_CATEGORIES.mix;
  const word = categoryList[Math.floor(Math.random() * categoryList.length)];
  roomData.currentWord = word;

  roomData.roundTime = modeConfig.roundTime;
  if (roomData.timerInterval) clearInterval(roomData.timerInterval);

  io.to(room).emit('clear_canvas');
  io.to(room).emit('new_round', {
    drawer: nextDrawer.username,
    drawerId: nextDrawer.id,
    roundTime: modeConfig.roundTime,
    turnCurrent: roomData.turnCount,
    turnTotal: roomData.players.length,
    gameMode: roomData.gameMode
  });
  io.to(nextDrawer.id).emit('your_turn', word);

  // 连击模式：清空其他玩家的连击数
  if (roomData.gameMode === 'combo') {
    Object.keys(roomData.playerCombos).forEach(playerId => {
      if (playerId !== roomData.currentDrawer) {
        roomData.playerCombos[playerId] = 0;
      }
    });
    io.to(room).emit('combo_reset');
  }

  roomData.timerInterval = setInterval(() => {
    roomData.roundTime--;
    io.to(room).emit('timer_update', roomData.roundTime);

    if (roomData.roundTime <= 0) {
      clearInterval(roomData.timerInterval);
      
      // 连击模式：时间到清空所有连击
      if (roomData.gameMode === 'combo') {
        Object.keys(roomData.playerCombos).forEach(playerId => {
          roomData.playerCombos[playerId] = 0;
        });
        io.to(room).emit('combo_reset');
      }
      
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

// 接力模式的回合
function startRelayRound(room) {
  const roomData = rooms[room];
  const modeConfig = GAME_MODES[roomData.gameMode];

  // 初始化接力
  roomData.relayIndex = 0;
  roomData.relayDrawers = [];

  // 选择接力画家（从当前轮次开始，选择N个人）
  const relayCount = Math.min(modeConfig.relayPlayers, roomData.players.length);
  for (let i = 0; i < relayCount; i++) {
    const drawerIndex = (roomData.turnCount + i) % roomData.players.length;
    roomData.relayDrawers.push(roomData.players[drawerIndex].id);
  }

  roomData.turnCount++;

  // 选择题目
  const categoryList = WORD_CATEGORIES[roomData.category] || WORD_CATEGORIES.mix;
  const word = categoryList[Math.floor(Math.random() * categoryList.length)];
  roomData.currentWord = word;

  // 清空画布，准备接力
  io.to(room).emit('clear_canvas');

  // 接力画家可以看到具体题目（和其他模式一样）
  roomData.relayDrawers.forEach(drawerId => {
    io.to(drawerId).emit('your_turn', word);
  });

  // 开始第一个接力
  startRelaySegment(room);
}

// 开始接力的某一段
function startRelaySegment(room) {
  const roomData = rooms[room];
  const modeConfig = GAME_MODES[roomData.gameMode];
  
  if (roomData.relayIndex >= roomData.relayDrawers.length) {
    // 接力完成，进入猜词阶段
    startRelayGuessing(room);
    return;
  }
  
  const currentDrawerId = roomData.relayDrawers[roomData.relayIndex];
  const currentDrawer = roomData.players.find(p => p.id === currentDrawerId);
  roomData.currentDrawer = currentDrawerId;
  
  roomData.roundTime = modeConfig.roundTime;
  if (roomData.timerInterval) clearInterval(roomData.timerInterval);
  
  const drawerNames = roomData.relayDrawers.map(id => {
    const p = roomData.players.find(player => player.id === id);
    return p ? p.username : '';
  }).join(' → ');
  
  io.to(room).emit('relay_segment', {
    currentDrawer: currentDrawer.username,
    currentDrawerId: currentDrawerId,
    relayIndex: roomData.relayIndex,
    relayTotal: roomData.relayDrawers.length,
    roundTime: modeConfig.roundTime,
    drawerNames: drawerNames,
    turnCurrent: roomData.turnCount,
    turnTotal: roomData.players.length
  });
  
  roomData.timerInterval = setInterval(() => {
    roomData.roundTime--;
    io.to(room).emit('timer_update', roomData.roundTime);
    
    if (roomData.roundTime <= 0) {
      clearInterval(roomData.timerInterval);
      // 这一段接力结束，进入下一段
      roomData.relayIndex++;
      setTimeout(() => startRelaySegment(room), 1500);
    }
  }, 1000);
}

// 接力完成后的猜词阶段
function startRelayGuessing(room) {
  const roomData = rooms[room];
  const modeConfig = GAME_MODES[roomData.gameMode];
  
  roomData.currentDrawer = null; // 没有当前画家了，进入猜词阶段
  roomData.roundTime = 30; // 猜词时间30秒
  
  io.to(room).emit('relay_guessing', {
    roundTime: 30
  });
  
  if (roomData.timerInterval) clearInterval(roomData.timerInterval);
  
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
