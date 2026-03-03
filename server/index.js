const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ============== Phase 2 & 3: 新功能数据结构 ==============

// 用户统计数据（成就系统）
const userStats = {};

// 成就定义
const ACHIEVEMENTS = {
  // 游戏成就
  first_win: { id: 'first_win', name: '初次胜利', icon: '🏆', desc: '赢得第一场游戏', condition: (stats) => stats.wins >= 1 },
  win_10: { id: 'win_10', name: '常胜将军', icon: '👑', desc: '赢得10场游戏', condition: (stats) => stats.wins >= 10 },
  win_50: { id: 'win_50', name: '传说玩家', icon: '⭐', desc: '赢得50场游戏', condition: (stats) => stats.wins >= 50 },
  
  // 猜词成就
  guess_10: { id: 'guess_10', name: '猜词新手', icon: '🎯', desc: '累计猜对10个词', condition: (stats) => stats.correctGuesses >= 10 },
  guess_50: { id: 'guess_50', name: '猜词达人', icon: '🎪', desc: '累计猜对50个词', condition: (stats) => stats.correctGuesses >= 50 },
  guess_100: { id: 'guess_100', name: '猜词大师', icon: '🔮', desc: '累计猜对100个词', condition: (stats) => stats.correctGuesses >= 100 },
  
  // 绘画成就
  draw_10: { id: 'draw_10', name: '画笔新手', icon: '🎨', desc: '担任画家10次', condition: (stats) => stats.drawCount >= 10 },
  draw_50: { id: 'draw_50', name: '灵魂画手', icon: '🖼️', desc: '担任画家50次', condition: (stats) => stats.drawCount >= 50 },
  
  // 连击成就
  combo_3: { id: 'combo_3', name: '小试牛刀', icon: '🔥', desc: '达成3连击', condition: (stats) => stats.maxCombo >= 3 },
  combo_5: { id: 'combo_5', name: '连击之王', icon: '💥', desc: '达成5连击', condition: (stats) => stats.maxCombo >= 5 },
  
  // 特殊成就
  blind_master: { id: 'blind_master', name: '盲画大师', icon: '🎭', desc: '在盲画模式中猜对5次', condition: (stats) => stats.blindGuesses >= 5 },
  relay_master: { id: 'relay_master', name: '接力达人', icon: '🤝', desc: '参与10次接力绘画', condition: (stats) => stats.relayCount >= 10 },
  sticker_lover: { id: 'sticker_lover', name: '贴纸爱好者', icon: '😄', desc: '使用贴纸50次', condition: (stats) => stats.stickerUse >= 50 },
  speed_demon: { id: 'speed_demon', name: '闪电侠', icon: '⚡', desc: '在5秒内猜对答案', condition: (stats) => stats.speedGuesses >= 1 },
  
  // 社交成就
  friend_5: { id: 'friend_5', name: '社交达人', icon: '👥', desc: '添加5个好友', condition: (stats) => stats.friendCount >= 5 },
  game_host: { id: 'game_host', name: '派对主人', icon: '🎉', desc: '创建20个房间', condition: (stats) => stats.roomsCreated >= 20 }
};

// 每日挑战
const DAILY_CHALLENGES = [
  { id: 'guess_animals', name: '动物专家', desc: '猜对3个动物类词语', target: 3, reward: 50, category: 'animals' },
  { id: 'guess_food', name: '美食家', desc: '猜对3个食物类词语', target: 3, reward: 50, category: 'food' },
  { id: 'use_sticker', name: '贴纸达人', desc: '使用10次贴纸', target: 10, reward: 30, type: 'sticker' },
  { id: 'play_classic', name: '经典玩家', desc: '完成3场经典模式', target: 3, reward: 40, mode: 'classic' },
  { id: 'play_lightning', name: '速度与激情', desc: '完成3场闪电模式', target: 3, reward: 60, mode: 'lightning' },
  { id: 'win_game', name: '今日冠军', desc: '赢得1场游戏', target: 1, reward: 100, type: 'win' },
  { id: 'combo_3', name: '连击新手', desc: '达成3连击', target: 3, reward: 80, type: 'combo' },
  { id: 'draw_rounds', name: '画家练习', desc: '担任画家5次', target: 5, reward: 40, type: 'draw' }
];

// 用户每日挑战进度
const userDailyChallenges = {};

// 自定义词库
const customWordLists = {};

// 好友关系
const friendships = {};

// 用户设置（主题等）
const userSettings = {};

// 生成每日挑战（每天重置）
function getDailyChallenges() {
  const today = new Date().toDateString();
  const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  // 从挑战池中选择3个
  const shuffled = [...DAILY_CHALLENGES].sort(() => ((seed * 9301 + 49297) % 233280) / 233280 - 0.5);
  return shuffled.slice(0, 3);
}

// 初始化用户统计
function initUserStats(userId, username) {
  if (!userStats[userId]) {
    userStats[userId] = {
      username,
      wins: 0,
      correctGuesses: 0,
      drawCount: 0,
      maxCombo: 0,
      blindGuesses: 0,
      relayCount: 0,
      stickerUse: 0,
      speedGuesses: 0,
      friendCount: 0,
      roomsCreated: 0,
      achievements: [],
      totalScore: 0,
      gamesPlayed: 0
    };
  }
  return userStats[userId];
}

// 检查成就
function checkAchievements(userId) {
  const stats = userStats[userId];
  if (!stats) return [];
  
  const newAchievements = [];
  for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (!stats.achievements.includes(key) && achievement.condition(stats)) {
      stats.achievements.push(key);
      newAchievements.push(achievement);
    }
  }
  return newAchievements;
}

// 更新每日挑战进度
function updateDailyChallenge(userId, type, value = 1) {
  const today = new Date().toDateString();
  
  if (!userDailyChallenges[userId]) {
    userDailyChallenges[userId] = { date: today, challenges: {} };
  }
  
  // 日期变更，重置挑战
  if (userDailyChallenges[userId].date !== today) {
    userDailyChallenges[userId] = { date: today, challenges: {} };
  }
  
  const dailyChallenges = getDailyChallenges();
  const progress = userDailyChallenges[userId].challenges;
  
  dailyChallenges.forEach(challenge => {
    if (!progress[challenge.id]) {
      progress[challenge.id] = { current: 0, completed: false, claimed: false };
    }
    
    // 检查是否匹配挑战类型
    let matches = false;
    if (challenge.type === type) matches = true;
    if (challenge.category && type === 'guess_' + challenge.category) matches = true;
    if (challenge.mode && type === 'play_' + challenge.mode) matches = true;
    
    if (matches && !progress[challenge.id].completed) {
      progress[challenge.id].current += value;
      if (progress[challenge.id].current >= challenge.target) {
        progress[challenge.id].completed = true;
      }
    }
  });
  
  return userDailyChallenges[userId];
}

// ============== API 端点 ==============

// 获取用户统计
app.get('/api/stats/:userId', (req, res) => {
  const stats = userStats[req.params.userId] || {};
  res.json(stats);
});

// 获取成就列表
app.get('/api/achievements', (req, res) => {
  res.json(ACHIEVEMENTS);
});

// 获取每日挑战
app.get('/api/daily-challenges/:userId', (req, res) => {
  const userId = req.params.userId;
  const today = new Date().toDateString();
  
  if (!userDailyChallenges[userId] || userDailyChallenges[userId].date !== today) {
    userDailyChallenges[userId] = { date: today, challenges: {} };
  }
  
  res.json({
    challenges: getDailyChallenges(),
    progress: userDailyChallenges[userId].challenges
  });
});

// 领取每日挑战奖励
app.post('/api/daily-challenges/claim', (req, res) => {
  const { userId, challengeId } = req.body;
  const today = new Date().toDateString();
  
  if (!userDailyChallenges[userId] || userDailyChallenges[userId].date !== today) {
    return res.status(400).json({ error: '挑战不存在' });
  }
  
  const progress = userDailyChallenges[userId].challenges[challengeId];
  if (!progress || !progress.completed || progress.claimed) {
    return res.status(400).json({ error: '无法领取' });
  }
  
  progress.claimed = true;
  const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId);
  
  res.json({ success: true, reward: challenge?.reward || 0 });
});

// 自定义词库 API
app.get('/api/wordlists', (req, res) => {
  res.json(customWordLists);
});

app.post('/api/wordlists', (req, res) => {
  const { userId, name, words, isPublic = false } = req.body;
  const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  customWordLists[id] = {
    id,
    name,
    words,
    creator: userId,
    isPublic,
    createdAt: new Date().toISOString()
  };
  
  res.json({ success: true, wordList: customWordLists[id] });
});

app.get('/api/wordlists/:id', (req, res) => {
  const wordList = customWordLists[req.params.id];
  if (!wordList) {
    return res.status(404).json({ error: '词库不存在' });
  }
  res.json(wordList);
});

// 好友系统 API
app.get('/api/friends/:userId', (req, res) => {
  const friends = friendships[req.params.userId] || { list: [], pending: [], requests: [] };
  res.json(friends);
});

app.post('/api/friends/request', (req, res) => {
  const { fromUserId, toUserId } = req.body;
  
  if (!friendships[toUserId]) {
    friendships[toUserId] = { list: [], pending: [], requests: [] };
  }
  if (!friendships[fromUserId]) {
    friendships[fromUserId] = { list: [], pending: [], requests: [] };
  }
  
  // 添加好友请求
  if (!friendships[toUserId].requests.includes(fromUserId)) {
    friendships[toUserId].requests.push(fromUserId);
  }
  if (!friendships[fromUserId].pending.includes(toUserId)) {
    friendships[fromUserId].pending.push(toUserId);
  }
  
  res.json({ success: true });
});

app.post('/api/friends/accept', (req, res) => {
  const { userId, friendId } = req.body;
  
  if (!friendships[userId] || !friendships[friendId]) {
    return res.status(400).json({ error: '无效请求' });
  }
  
  // 移除请求，添加好友
  friendships[userId].requests = friendships[userId].requests.filter(id => id !== friendId);
  friendships[friendId].pending = friendships[friendId].pending.filter(id => id !== userId);
  
  if (!friendships[userId].list.includes(friendId)) {
    friendships[userId].list.push(friendId);
  }
  if (!friendships[friendId].list.includes(userId)) {
    friendships[friendId].list.push(userId);
  }
  
  // 更新好友数量统计
  if (userStats[userId]) {
    userStats[userId].friendCount = friendships[userId].list.length;
  }
  if (userStats[friendId]) {
    userStats[friendId].friendCount = friendships[friendId].list.length;
  }
  
  res.json({ success: true });
});

// 用户设置 API
app.get('/api/settings/:userId', (req, res) => {
  res.json(userSettings[req.params.userId] || { theme: 'default', soundEnabled: true, volume: 0.5 });
});

app.post('/api/settings/:userId', (req, res) => {
  userSettings[req.params.userId] = { ...userSettings[req.params.userId], ...req.body };
  res.json({ success: true, settings: userSettings[req.params.userId] });
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
    roundTime: 30,
    relayPlayers: 3,
    guessScore: (timeLeft) => Math.max(15, Math.ceil(timeLeft * 2)),
    drawerScore: 3
  },
  blind: {
    name: "盲画模式",
    roundTime: 60,
    guessScore: (timeLeft) => Math.max(20, Math.ceil(timeLeft)),
    drawerScore: 10
  },
  // Phase 2: 合作绘画模式
  collaborative: {
    name: "合作模式",
    roundTime: 90,
    guessScore: (timeLeft) => Math.max(15, Math.ceil(timeLeft / 1.5)),
    drawerScore: 3, // 每个画家得分
    collaborative: true
  }
};

const rooms = {};
const ROUND_TIME = 60; 

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', ({ room, username, category = 'mix', gameMode = 'classic' }) => {
    socket.join(room);
    
    // 初始化用户统计
    initUserStats(socket.id, username);
    userStats[socket.id].roomsCreated++;
    
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
        turnCount: 0,
        relayDrawers: [],
        relayIndex: 0,
        playerCombos: {},
        // Phase 2: 合作绘画模式
        collaborativeDrawers: [],
        // Phase 2: 当前回合分类追踪（用于每日挑战）
        currentCategory: category
      };
    }

    const existingPlayer = rooms[room].players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      rooms[room].players.push({ 
        id: socket.id, 
        username, 
        avatarSeed: Math.random().toString(36).substring(7),
        score: 0 
      });
      if (rooms[room].gameMode === 'combo') {
        rooms[room].playerCombos[socket.id] = 0;
      }
    }

    io.to(room).emit('update_players', rooms[room].players);
    io.to(room).emit('room_config', { 
      category: rooms[room].category,
      gameMode: rooms[room].gameMode 
    });
    
    // 发送用户统计和成就
    socket.emit('user_stats', userStats[socket.id]);
    socket.emit('achievements_update', Object.values(ACHIEVEMENTS).filter(a => 
      userStats[socket.id].achievements.includes(a.id)
    ));
    
    // 发送每日挑战
    const today = new Date().toDateString();
    if (!userDailyChallenges[socket.id] || userDailyChallenges[socket.id].date !== today) {
      userDailyChallenges[socket.id] = { date: today, challenges: {} };
    }
    socket.emit('daily_challenges', {
      challenges: getDailyChallenges(),
      progress: userDailyChallenges[socket.id].challenges
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
      // 合作模式：所有玩家都可以绘画
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(data.room).emit('draw_data', data);
        }
      }
      // 接力模式：检查是否在接力画家队列中
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
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
      // 合作模式
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(data.room).emit('fill_canvas', data);
        }
      }
      // 接力模式
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('fill_canvas', data);
        }
      } else {
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('fill_canvas', data);
        }
      }
    }
  });

  socket.on('draw_shape', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      // 合作模式
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(data.room).emit('draw_shape', data);
        }
      }
      // 接力模式
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('draw_shape', data);
        }
      } else {
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('draw_shape', data);
        }
      }
    }
  });

  // Sticker events - 更新贴纸使用统计
  socket.on('add_sticker', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      // 更新贴纸使用统计
      if (userStats[socket.id]) {
        userStats[socket.id].stickerUse++;
        updateDailyChallenge(socket.id, 'sticker', 1);
      }
      
      // 合作模式
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(data.room).emit('add_sticker', data);
        }
      }
      // 接力模式
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('add_sticker', data);
        }
      } else {
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('add_sticker', data);
        }
      }
    }
  });

  socket.on('update_sticker', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      if (roomData.currentDrawer === socket.id) {
        socket.to(data.room).emit('update_sticker', data);
      }
    }
  });

  socket.on('delete_sticker', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      if (roomData.currentDrawer === socket.id) {
        socket.to(data.room).emit('delete_sticker', data);
      }
    }
  });

  socket.on('clear_canvas', (room) => {
    const roomData = rooms[room];
    if (roomData) {
      // 合作模式
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(room).emit('clear_canvas');
        }
      }
      // 接力模式
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(room).emit('clear_canvas');
        }
      } else {
        if (roomData.currentDrawer === socket.id) {
          socket.to(room).emit('clear_canvas');
        }
      }
    }
  });

  // Undo event
  socket.on('undo', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      // 合作模式
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(data.room).emit('undo');
        }
      }
      // 接力模式
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('undo');
        }
      } else {
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('undo');
        }
      }
    }
  });

  // Redo event
  socket.on('redo', (data) => {
    const roomData = rooms[data.room];
    if (roomData) {
      // 合作模式
      if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
        if (roomData.collaborativeDrawers.includes(socket.id)) {
          socket.to(data.room).emit('redo');
        }
      }
      // 接力模式
      else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
        if (roomData.relayDrawers.includes(socket.id)) {
          socket.to(data.room).emit('redo');
        }
      } else {
        if (roomData.currentDrawer === socket.id) {
          socket.to(data.room).emit('redo');
        }
      }
    }
  });

  socket.on('restart_game', (room) => {
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
         // 重置合作模式数据
         if (roomData.gameMode === 'collaborative') {
           roomData.collaborativeDrawers = [];
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
        // 合作模式：所有画家不能猜
        if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers) {
          if (!roomData.collaborativeDrawers.includes(socket.id)) {
            handleCorrectGuess(room, socket.id, author);
            return;
          }
        }
        // 接力模式：接力画家不能猜
        else if (roomData.gameMode === 'relay' && roomData.relayDrawers) {
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
  const maxTime = modeConfig.roundTime;
  const timeUsed = maxTime - roomData.roundTime;
  
  // 更新统计
  if (userStats[winnerId]) {
    userStats[winnerId].correctGuesses++;
    userStats[winnerId].totalScore += modeConfig.guessScore(roomData.roundTime);
    
    // 快速猜词成就（5秒内）
    if (timeUsed <= 5) {
      userStats[winnerId].speedGuesses++;
    }
    
    // 盲画模式统计
    if (roomData.gameMode === 'blind') {
      userStats[winnerId].blindGuesses++;
    }
    
    // 更新每日挑战
    updateDailyChallenge(winnerId, 'guess', 1);
    if (roomData.currentCategory) {
      updateDailyChallenge(winnerId, 'guess_' + roomData.currentCategory, 1);
    }
    updateDailyChallenge(winnerId, 'win', 1); // 猜对也算赢
  }
  
  // 连击模式：增加连击数
  if (roomData.gameMode === 'combo') {
    roomData.playerCombos[winnerId] = (roomData.playerCombos[winnerId] || 0) + 1;
    const comboMultiplier = Math.min(roomData.playerCombos[winnerId], 5);
    const guessScore = modeConfig.guessScore(roomData.roundTime, comboMultiplier);
    
    if (player) player.score += guessScore;
    
    // 更新最大连击记录
    if (userStats[winnerId] && comboMultiplier > userStats[winnerId].maxCombo) {
      userStats[winnerId].maxCombo = comboMultiplier;
    }
    
    // 更新连击每日挑战
    updateDailyChallenge(winnerId, 'combo', comboMultiplier);
    
    // 给所有画家加分
    if (roomData.gameMode === 'relay' && roomData.relayDrawers.length > 0) {
      roomData.relayDrawers.forEach(drawerId => {
        const drawer = roomData.players.find(p => p.id === drawerId);
        if (drawer) drawer.score += modeConfig.drawerScore;
      });
    } else if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers.length > 0) {
      roomData.collaborativeDrawers.forEach(drawerId => {
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
    
    io.to(room).emit('combo_update', {
      playerId: winnerId,
      combo: comboMultiplier
    });
    
  } else {
    // 其他模式
    const guessScore = modeConfig.guessScore(roomData.roundTime);
    if (player) player.score += guessScore;
    
    // 给所有接力/合作画家加分
    if (roomData.gameMode === 'relay' && roomData.relayDrawers.length > 0) {
      roomData.relayDrawers.forEach(drawerId => {
        const drawer = roomData.players.find(p => p.id === drawerId);
        if (drawer) drawer.score += modeConfig.drawerScore;
      });
    } else if (roomData.gameMode === 'collaborative' && roomData.collaborativeDrawers.length > 0) {
      roomData.collaborativeDrawers.forEach(drawerId => {
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
  
  // 检查成就
  const newAchievements = checkAchievements(winnerId);
  if (newAchievements.length > 0) {
    io.to(winnerId).emit('achievement_unlocked', newAchievements);
    io.to(room).emit('receive_message', {
      room,
      author: "系统",
      message: `🎊 ${winnerName} 解锁成就：${newAchievements.map(a => a.icon + ' ' + a.name).join(', ')}`,
      isSystem: true,
      type: 'achievement'
    });
  }
  
  // 发送更新的统计
  io.to(winnerId).emit('user_stats', userStats[winnerId]);
  
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
  if (roomData.gameMode === 'relay' || roomData.gameMode === 'collaborative') {
    // 接力/合作模式：每组算一轮，总轮数为玩家数
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

  // 不同模式特殊处理
  if (roomData.gameMode === 'relay') {
    startRelayRound(room);
  } else if (roomData.gameMode === 'collaborative') {
    startCollaborativeRound(room);
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
  roomData.currentCategory = roomData.category;

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
  
  // 更新绘画统计
  if (userStats[nextDrawer.id]) {
    userStats[nextDrawer.id].drawCount++;
    updateDailyChallenge(nextDrawer.id, 'draw', 1);
  }

  // 连击模式：清空其他玩家的连击数
  if (roomData.gameMode === 'combo') {
    Object.keys(roomData.playerCombos).forEach(playerId => {
      if (playerId !== roomData.currentDrawer) {
        roomData.playerCombos[playerId] = 0;
      }
    });
    io.to(room).emit('combo_reset');
  }
  
  // 更新游戏模式每日挑战
  roomData.players.forEach(p => {
    updateDailyChallenge(p.id, 'play_' + roomData.gameMode, 1);
  });

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
  
  roomData.currentDrawer = null;
  roomData.roundTime = 30;
  
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

// Phase 2: 合作绘画模式的回合
function startCollaborativeRound(room) {
  const roomData = rooms[room];
  const modeConfig = GAME_MODES[roomData.gameMode];
  
  // 选择所有玩家作为合作画家（除了最后一个人当猜题者）
  const drawerCount = Math.max(2, roomData.players.length - 1);
  roomData.collaborativeDrawers = [];
  
  for (let i = 0; i < drawerCount; i++) {
    const drawerIndex = (roomData.turnCount + i) % roomData.players.length;
    roomData.collaborativeDrawers.push(roomData.players[drawerIndex].id);
  }
  
  roomData.turnCount++;
  
  // 选择题目
  const categoryList = WORD_CATEGORIES[roomData.category] || WORD_CATEGORIES.mix;
  const word = categoryList[Math.floor(Math.random() * categoryList.length)];
  roomData.currentWord = word;
  roomData.currentCategory = roomData.category;
  
  roomData.roundTime = modeConfig.roundTime;
  if (roomData.timerInterval) clearInterval(roomData.timerInterval);
  
  io.to(room).emit('clear_canvas');
  
  const drawerNames = roomData.collaborativeDrawers.map(id => {
    const p = roomData.players.find(player => player.id === id);
    return p ? p.username : '';
  }).join(' + ');
  
  io.to(room).emit('collaborative_round', {
    drawers: drawerNames,
    drawerIds: roomData.collaborativeDrawers,
    roundTime: modeConfig.roundTime,
    turnCurrent: roomData.turnCount,
    turnTotal: roomData.players.length
  });
  
  // 所有合作画家可以看到题目
  roomData.collaborativeDrawers.forEach(drawerId => {
    io.to(drawerId).emit('your_turn', word);
    // 更新绘画统计
    if (userStats[drawerId]) {
      userStats[drawerId].drawCount++;
      updateDailyChallenge(drawerId, 'draw', 1);
    }
  });
  
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
    
    // 更新胜利统计
    if (sortedPlayers.length > 0) {
      const winner = sortedPlayers[0];
      if (userStats[winner.id]) {
        userStats[winner.id].wins++;
        
        // 检查成就
        const newAchievements = checkAchievements(winner.id);
        if (newAchievements.length > 0) {
          io.to(winner.id).emit('achievement_unlocked', newAchievements);
        }
        
        // 发送更新的统计
        io.to(winner.id).emit('user_stats', userStats[winner.id]);
      }
    }
    
    // 更新所有玩家的游戏完成统计
    roomData.players.forEach(p => {
      if (userStats[p.id]) {
        userStats[p.id].gamesPlayed++;
        
        // 更新每日挑战 - 完成游戏
        updateDailyChallenge(p.id, 'win', p.id === sortedPlayers[0]?.id ? 1 : 0);
        
        // 发送更新的统计
        io.to(p.id).emit('user_stats', userStats[p.id]);
        
        // 发送更新的每日挑战进度
        io.to(p.id).emit('daily_challenges', {
          challenges: getDailyChallenges(),
          progress: userDailyChallenges[p.id]?.challenges || {}
        });
      }
    });
    
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
