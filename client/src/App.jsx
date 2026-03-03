import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import {
  Pencil, Eraser, Trash2, Send, Play, Users,
  Palette, Timer, Crown, MessageCircle, PaintBucket, RotateCcw,
  RotateCw, Undo, Redo, Square, Circle, Minus, ArrowUpRight,
  Sticker, X, Search, Star, Trophy, Target, Gift, Bell,
  Volume2, VolumeX, Moon, Sun, Heart, UserPlus, Settings, BookOpen
} from 'lucide-react';
import { STICKER_CATEGORIES, STICKERS, getStickersByCategory, getRecommendedStickers } from './stickers.js';

// In production with nginx proxy, use relative path. In dev, use localhost:3001
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");
const socket = io.connect(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// ============== 主题配置 ==============
const THEMES = {
  default: {
    name: '默认',
    icon: '🎨',
    primary: 'from-blue-600 to-purple-600',
    bg: 'from-indigo-100 via-purple-50 to-pink-100',
    card: 'bg-white/90'
  },
  dark: {
    name: '暗黑',
    icon: '🌙',
    primary: 'from-gray-700 to-gray-900',
    bg: 'from-gray-900 via-gray-800 to-gray-900',
    card: 'bg-gray-800/90',
    text: 'text-white'
  },
  pink: {
    name: '粉色',
    icon: '💖',
    primary: 'from-pink-500 to-rose-500',
    bg: 'from-pink-100 via-rose-50 to-red-100',
    card: 'bg-white/90'
  },
  ocean: {
    name: '海洋',
    icon: '🌊',
    primary: 'from-cyan-500 to-blue-600',
    bg: 'from-cyan-100 via-blue-50 to-indigo-100',
    card: 'bg-white/90'
  },
  forest: {
    name: '森林',
    icon: '🌲',
    primary: 'from-green-500 to-emerald-600',
    bg: 'from-green-100 via-emerald-50 to-teal-100',
    card: 'bg-white/90'
  }
};

// ============== 音效系统 ==============
const SOUNDS = {
  correct: { frequency: 800, duration: 0.15, type: 'sine' },
  wrong: { frequency: 200, duration: 0.3, type: 'square' },
  tick: { frequency: 600, duration: 0.05, type: 'sine' },
  achievement: { frequency: [523, 659, 784], duration: 0.2, type: 'sine' },
  button: { frequency: 440, duration: 0.05, type: 'sine' }
};

// 播放音效
const playSound = (soundName, volume = 0.3, enabled = true) => {
  if (!enabled || typeof window === 'undefined') return;
  
  const sound = SOUNDS[soundName];
  if (!sound) return;
  
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (Array.isArray(sound.frequency)) {
      // 多音符音效
      let time = audioContext.currentTime;
      sound.frequency.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = sound.type;
        gain.gain.value = volume;
        osc.start(time + i * sound.duration);
        osc.stop(time + (i + 1) * sound.duration);
      });
    } else {
      oscillator.frequency.value = sound.frequency;
      oscillator.type = sound.type;
      gainNode.gain.value = volume;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    }
  } catch (e) {
    // 忽略音效错误
  }
};

// ============== Flood Fill Algorithm ==============
function floodFill(ctx, startX, startY, fillColor, canvasWidth, canvasHeight) {
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  // Convert hex color to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const fillRgb = hexToRgb(fillColor);

  // Get pixel index
  const getPixelIndex = (x, y) => (y * canvasWidth + x) * 4;

  // Get pixel color at position
  const getPixelColor = (x, y) => {
    const idx = getPixelIndex(x, y);
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
  };

  // Check if colors match (with tolerance)
  const colorsMatch = (c1, c2, tolerance = 32) => {
    return Math.abs(c1.r - c2.r) <= tolerance &&
           Math.abs(c1.g - c2.g) <= tolerance &&
           Math.abs(c1.b - c2.b) <= tolerance;
  };

  // Set pixel color
  const setPixelColor = (x, y) => {
    const idx = getPixelIndex(x, y);
    data[idx] = fillRgb.r;
    data[idx + 1] = fillRgb.g;
    data[idx + 2] = fillRgb.b;
    data[idx + 3] = 255;
  };

  const startColor = getPixelColor(Math.floor(startX), Math.floor(startY));

  // Don't fill if clicking on same color
  if (colorsMatch(startColor, fillRgb, 10)) return;

  // Stack-based flood fill (non-recursive to avoid stack overflow)
  const stack = [[Math.floor(startX), Math.floor(startY)]];
  const visited = new Set();

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) continue;

    const currentColor = getPixelColor(x, y);
    if (!colorsMatch(currentColor, startColor)) continue;

    visited.add(key);
    setPixelColor(x, y);

    // Add neighbors (4-directional)
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

// ============== Podium Component ==============
function Podium({ leaderboard, onRestart }) {
  useEffect(() => {
    // Fireworks effect
    const duration = 5000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const getMedal = (index) => {
    if (index === 0) return { emoji: '🥇', color: 'from-yellow-400 to-amber-500', size: 'h-32' };
    if (index === 1) return { emoji: '🥈', color: 'from-gray-300 to-gray-400', size: 'h-24' };
    if (index === 2) return { emoji: '🥉', color: 'from-orange-400 to-orange-500', size: 'h-20' };
    return { emoji: '', color: 'from-gray-200 to-gray-300', size: 'h-16' };
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
        <h1 className="text-4xl font-black text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500">
          🎉 游戏结束 🎉
        </h1>

        {/* Podium Display */}
        <div className="flex justify-center items-end gap-4 mb-8 h-48">
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="flex flex-col items-center">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${leaderboard[1].avatarSeed}`}
                className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white shadow-lg mb-2"
                alt="2nd"
              />
              <span className="font-bold text-gray-700 truncate max-w-[80px]">{leaderboard[1].username}</span>
              <span className="text-sm text-gray-500">{leaderboard[1].score} 分</span>
              <div className={`w-20 ${getMedal(1).size} bg-gradient-to-t ${getMedal(1).color} rounded-t-lg mt-2 flex items-center justify-center text-2xl`}>
                {getMedal(1).emoji}
              </div>
            </div>
          )}

          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="flex flex-col items-center">
              <div className="text-3xl animate-bounce">👑</div>
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${leaderboard[0].avatarSeed}`}
                className="w-20 h-20 rounded-full border-4 border-yellow-400 bg-white shadow-lg mb-2"
                alt="1st"
              />
              <span className="font-bold text-gray-800 truncate max-w-[100px] text-lg">{leaderboard[0].username}</span>
              <span className="text-sm text-yellow-600 font-bold">{leaderboard[0].score} 分</span>
              <div className={`w-24 ${getMedal(0).size} bg-gradient-to-t ${getMedal(0).color} rounded-t-lg mt-2 flex items-center justify-center text-3xl shadow-lg`}>
                {getMedal(0).emoji}
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="flex flex-col items-center">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${leaderboard[2].avatarSeed}`}
                className="w-14 h-14 rounded-full border-4 border-orange-300 bg-white shadow-lg mb-2"
                alt="3rd"
              />
              <span className="font-bold text-gray-600 truncate max-w-[70px] text-sm">{leaderboard[2].username}</span>
              <span className="text-xs text-gray-500">{leaderboard[2].score} 分</span>
              <div className={`w-18 ${getMedal(2).size} bg-gradient-to-t ${getMedal(2).color} rounded-t-lg mt-2 flex items-center justify-center text-xl`}>
                {getMedal(2).emoji}
              </div>
            </div>
          )}
        </div>

        {/* Full Leaderboard */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-32 overflow-y-auto">
          {leaderboard.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-gray-400">#{idx + 1}</span>
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.avatarSeed}`}
                  className="w-8 h-8 rounded-full bg-white"
                  alt=""
                />
                <span className="font-medium">{p.username}</span>
              </div>
              <span className="font-bold text-blue-600">{p.score} 分</span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl hover:shadow-lg transition font-bold text-lg flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> 再来一局
        </button>
      </div>
    </div>
  );
}

// ============== Main App Component ==============
function App() {
  // App State
  const [isJoined, setIsJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [category, setCategory] = useState("mix");
  const [gameMode, setGameMode] = useState("classic");
  const [players, setPlayers] = useState([]);

  // Game State
  const [gameStarted, setGameStarted] = useState(false);
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [roundInfo, setRoundInfo] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [maxTime, setMaxTime] = useState(60);
  const [turnInfo, setTurnInfo] = useState({ current: 0, total: 0 });
  const [leaderboard, setLeaderboard] = useState(null);

  // 游戏模式相关状态
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [relayInfo, setRelayInfo] = useState({ current: 0, total: 0, isGuessing: false });
  const [collaborativeInfo, setCollaborativeInfo] = useState({ drawers: [], isDrawing: false });

  // Chat State
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const chatEndRef = useRef(null);

  // Canvas State
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [color, setColor] = useState("#3b82f6");
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState('pen');
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const shapeStartPos = useRef({ x: 0, y: 0 });

  // History State (Undo/Redo)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistory = 50;

  // Sticker State
  const [stickerPanelOpen, setStickerPanelOpen] = useState(false);
  const [stickerCategory, setStickerCategory] = useState('emotions');
  const [searchQuery, setSearchQuery] = useState('');
  const [placedStickers, setPlacedStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [draggedSticker, setDraggedSticker] = useState(null);
  const stickerDropZoneRef = useRef(null);

  // ============== Phase 2 & 3: 新功能状态 ==============
  
  // 成就系统
  const [userStats, setUserStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [showAchievementPanel, setShowAchievementPanel] = useState(false);
  
  // 每日挑战
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [challengeProgress, setChallengeProgress] = useState({});
  const [showChallengePanel, setShowChallengePanel] = useState(false);
  
  // 主题系统
  const [currentTheme, setCurrentTheme] = useState('default');
  const [showThemePanel, setShowThemePanel] = useState(false);
  
  // 音效系统
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  // 好友系统
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  
  // 自定义词库
  const [customWordLists, setCustomWordLists] = useState([]);
  const [showWordListPanel, setShowWordListPanel] = useState(false);
  const [newWordListName, setNewWordListName] = useState('');
  const [newWordListWords, setNewWordListWords] = useState('');

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  const joinRoom = () => {
    if (username.trim() && room.trim()) {
      socket.emit("join_room", { room, username, category, gameMode });
      setIsJoined(true);
    }
  };

  const startGame = () => {
    socket.emit("start_game", room);
  };

  const restartGame = () => {
    setLeaderboard(null);
    socket.emit("restart_game", room);
  };

  const sendMessage = async () => {
    if (currentMessage.trim()) {
      const messageData = {
        room,
        author: username,
        message: currentMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    socket.emit("clear_canvas", room);
  };

  // Save canvas state to history
  const saveToHistory = () => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Remove redo states
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);

    // Limit history size
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const handleUndo = () => {
    if (!isDrawer || historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
    socket.emit("undo", { room });
  };

  // Redo
  const handleRedo = () => {
    if (!isDrawer || historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
    socket.emit("redo", { room });
  };

  // ============== Sticker Functions ==============

  // 添加贴纸
  const addSticker = (emoji, x, y, scale = 1, rotation = 0) => {
    if (!isDrawer) return;

    const newSticker = {
      id: `sticker_${Date.now()}_${Math.random()}`,
      emoji,
      x,
      y,
      scale,
      rotation,
      opacity: 1,
      zIndex: placedStickers.length + 10
    };

    setPlacedStickers([...placedStickers, newSticker]);
    saveToHistory();

    socket.emit("add_sticker", {
      room,
      sticker: newSticker
    });
  };

  // 更新贴纸
  const updateSticker = (stickerId, updates) => {
    if (!isDrawer) return;

    setPlacedStickers(placedStickers.map(sticker =>
      sticker.id === stickerId ? { ...sticker, ...updates } : sticker
    ));

    socket.emit("update_sticker", {
      room,
      stickerId,
      updates
    });
  };

  // 删除贴纸
  const deleteSticker = (stickerId) => {
    if (!isDrawer) return;

    setPlacedStickers(placedStickers.filter(s => s.id !== stickerId));
    setSelectedStickerId(null);
    saveToHistory();

    socket.emit("delete_sticker", {
      room,
      stickerId
    });
  };

  // 渲染贴纸
  const renderStickers = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // 清空画布并重新渲染所有内容（贴纸在顶层）
    // 注意：这需要保存当前的绘画内容
    // 简化版：直接在画布上绘制贴纸
    placedStickers.forEach(sticker => {
      ctx.save();
      ctx.globalAlpha = sticker.opacity;
      ctx.translate(sticker.x, sticker.y);
      ctx.rotate(sticker.rotation * Math.PI / 180);
      ctx.scale(sticker.scale, sticker.scale);

      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 选中状态效果
      if (selectedStickerId === sticker.id) {
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 10;
      }

      ctx.fillText(sticker.emoji, 0, 0);
      ctx.restore();
    });
  };

  // 贴纸拖拽开始
  const handleStickerDragStart = (event, emoji) => {
    event.preventDefault();
    setDraggedSticker(emoji);
  };

  // 贴纸放置
  const handleStickerDrop = (event) => {
    event.preventDefault();
    if (!draggedSticker || !isDrawer) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    addSticker(draggedSticker, x, y);
    setDraggedSticker(null);
    setStickerPanelOpen(false);
  };

  // 贴纸拖拽覆盖
  const handleStickerDragOver = (event) => {
    event.preventDefault();
  };

  // Coordinate helper
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Canvas drawing handlers
  const handleCanvasClick = (event) => {
    if (!isDrawer) return;

    if (tool === 'bucket') {
      const { x, y } = getCoordinates(event);

      // 盲画模式：画家只发送不渲染
      if (gameMode !== 'blind') {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        floodFill(ctx, x, y, color, canvas.width, canvas.height);
      }

      socket.emit("fill_canvas", { room, x, y, color });
    }
  };

  const startDrawing = (event) => {
    if (!isDrawer || tool === 'bucket') return;
    event.preventDefault();

    const { x, y } = getCoordinates(event);
    isDrawing.current = true;
    lastPos.current = { x, y };
    shapeStartPos.current = { x, y }; // 保存形状起始位置

    // 形状工具开始时，先保存当前画布状态到预览层
    if (['rect', 'circle', 'arrow', 'line'].includes(tool)) {
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        const previewCtx = previewCanvas.getContext("2d");
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
    }
  };

  const draw = (event) => {
    if (!isDrawing.current || !isDrawer || tool === 'bucket') return;
    event.preventDefault();

    const { x, y } = getCoordinates(event);

    // 形状工具：在预览层绘制预览
    if (['rect', 'circle', 'arrow', 'line'].includes(tool)) {
      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) return;

      const previewCtx = previewCanvas.getContext("2d");
      const startX = shapeStartPos.current.x;
      const startY = shapeStartPos.current.y;

      // 清除预览层
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

      // 绘制形状预览
      previewCtx.strokeStyle = color;
      previewCtx.lineWidth = lineWidth;
      previewCtx.lineCap = "round";
      previewCtx.lineJoin = "round";

      if (tool === 'rect') {
        const width = x - startX;
        const height = y - startY;
        previewCtx.strokeRect(startX, startY, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        previewCtx.beginPath();
        previewCtx.arc(startX, startY, radius, 0, Math.PI * 2);
        previewCtx.stroke();
      } else if (tool === 'line') {
        previewCtx.beginPath();
        previewCtx.moveTo(startX, startY);
        previewCtx.lineTo(x, y);
        previewCtx.stroke();
      } else if (tool === 'arrow') {
        const headLength = lineWidth * 3;
        const dx = x - startX;
        const dy = y - startY;
        const angle = Math.atan2(dy, dx);

        previewCtx.beginPath();
        previewCtx.moveTo(startX, startY);
        previewCtx.lineTo(x, y);
        previewCtx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
        previewCtx.moveTo(x, y);
        previewCtx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));
        previewCtx.stroke();
      }

      return;
    }

    // 普通绘图：画笔和橡皮擦
    // 盲画模式：画家不渲染自己的绘画
    if (gameMode !== 'blind' || !isDrawer) {
      const ctx = canvasRef.current.getContext("2d");

      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    socket.emit("draw_data", {
      room,
      x, y,
      prevX: lastPos.current.x,
      prevY: lastPos.current.y,
      color: tool === 'eraser' ? '#ffffff' : color,
      size: lineWidth,
      tool
    });

    lastPos.current = { x, y };
  };

  const stopDrawing = (event) => {
    if (!isDrawing.current) return;

    const { x, y } = getCoordinates(event);
    const startX = shapeStartPos.current.x;
    const startY = shapeStartPos.current.y;

    // 形状工具：提交到主画布
    // 盲画模式：画家不渲染自己的形状
    if (['rect', 'circle', 'arrow', 'line'].includes(tool)) {
      if (gameMode !== 'blind' || !isDrawer) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (tool === 'rect') {
          const width = x - startX;
          const height = y - startY;
          ctx.strokeRect(startX, startY, width, height);

          socket.emit("draw_shape", {
            room,
            shape: 'rect',
            x: startX, y: startY,
            width, height,
            color,
            size: lineWidth
          });
        } else if (tool === 'circle') {
          const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
          ctx.beginPath();
          ctx.arc(startX, startY, radius, 0, Math.PI * 2);
          ctx.stroke();

          socket.emit("draw_shape", {
            room,
            shape: 'circle',
            x: startX, y: startY,
            radius,
            color,
            size: lineWidth
          });
        } else if (tool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.stroke();

          socket.emit("draw_shape", {
            room,
            shape: 'line',
            x1: startX, y1: startY,
            x2: x, y2: y,
            color,
            size: lineWidth
          });
        } else if (tool === 'arrow') {
          const headLength = lineWidth * 3;
          const dx = x - startX;
          const dy = y - startY;
          const angle = Math.atan2(dy, dx);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x, y);
          ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();

          socket.emit("draw_shape", {
            room,
            shape: 'arrow',
            x1: startX, y1: startY,
            x2: x, y2: y,
            headLength,
            color,
            size: lineWidth
          });
        }
      } else {
        // 盲画模式下画家只发送不渲染
        if (tool === 'rect') {
          const width = x - startX;
          const height = y - startY;
          socket.emit("draw_shape", {
            room,
            shape: 'rect',
            x: startX, y: startY,
            width, height,
            color,
            size: lineWidth
          });
        } else if (tool === 'circle') {
          const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
          socket.emit("draw_shape", {
            room,
            shape: 'circle',
            x: startX, y: startY,
            radius,
            color,
            size: lineWidth
          });
        } else if (tool === 'line') {
          socket.emit("draw_shape", {
            room,
            shape: 'line',
            x1: startX, y1: startY,
            x2: x, y2: y,
            color,
            size: lineWidth
          });
        } else if (tool === 'arrow') {
          const headLength = lineWidth * 3;
          const dx = x - startX;
          const dy = y - startY;
          const angle = Math.atan2(dy, dx);
          socket.emit("draw_shape", {
            room,
            shape: 'arrow',
            x1: startX, y1: startY,
            x2: x, y2: y,
            headLength,
            color,
            size: lineWidth
          });
        }
      }

      // 清除预览层
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        const previewCtx = previewCanvas.getContext("2d");
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
    }

    saveToHistory();
    isDrawing.current = false;
  };

  // Effects
  const triggerWinEffect = useCallback((type) => {
    const duration = 3000;
    const end = Date.now() + duration;

    if (!type || type === 1) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else if (type === 2) {
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          startVelocity: 30, spread: 360, ticks: 60, zIndex: 0,
          particleCount: 50, origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 250);
    } else if (type === 3) {
      const scalar = 2;
      const shapes = ['🎉', '🎊', '⭐', '✨'].map(e => confetti.shapeFromText({ text: e, scalar }));
      confetti({ shapes, scalar, particleCount: 30, spread: 100, origin: { y: 0 } });
    }
  }, []);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => {
        const lastMsg = list[list.length - 1];
        if (lastMsg && lastMsg.author === data.author && lastMsg.message === data.message && !data.isSystem) {
          return list;
        }
        return [...list, data];
      });
    });

    socket.on("update_players", (data) => setPlayers(data));

    socket.on("new_round", (data) => {
      setGameStarted(true);
      setIsDrawer(data.drawerId === socket.id);
      setCurrentWord("");
      setTimeLeft(data.roundTime);
      setMaxTime(data.roundTime);
      setTurnInfo({ current: data.turnCurrent, total: data.turnTotal });
      setRoundInfo(data.drawerId === socket.id ? "你的回合！请画画！" : `等待 ${data.drawer} 画画...`);
      setRelayInfo({ current: 0, total: 0, isGuessing: false }); // 重置接力信息

      // Reset canvas to white
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Reset history
      setHistory([]);
      setHistoryIndex(-1);
    });

    // 接力模式：接力阶段
    socket.on("relay_segment", (data) => {
      setGameStarted(true);
      setIsDrawer(data.currentDrawerId === socket.id);
      setTimeLeft(data.roundTime);
      setMaxTime(data.roundTime);
      setTurnInfo({ current: data.turnCurrent, total: data.turnTotal });
      setRelayInfo({ current: data.relayIndex + 1, total: data.relayTotal, isGuessing: false });

      if (data.currentDrawerId === socket.id) {
        setRoundInfo(`接力画画 (${data.relayIndex + 1}/${data.relayTotal})`);
      } else {
        setRoundInfo(`${data.currentDrawer} 正在接力画画... (${data.relayIndex + 1}/${data.relayTotal})`);
      }
    });

    // 接力模式：猜词阶段
    socket.on("relay_guessing", (data) => {
      setIsDrawer(false);
      setCurrentWord(""); // 不显示任何提示
      setTimeLeft(data.roundTime);
      setMaxTime(data.roundTime);
      setRelayInfo({ current: 0, total: 0, isGuessing: true });
      setRoundInfo("接力完成！大家猜猜这幅画是什么？");
    });

    socket.on("your_turn", (word) => {
      setCurrentWord(word);
      if (gameMode === 'relay') {
        setRoundInfo(`接力题目: ${word}`);
      } else {
        setRoundInfo(`题目: ${word}`);
      }
    });

    socket.on("timer_update", (time) => setTimeLeft(time));

    socket.on("correct_guess", (data) => {
      triggerWinEffect(data.effectType);
      setRoundInfo(`🎉 ${data.winner} 答对了！`);
    });

    // 连击模式：连击更新
    socket.on("combo_update", (data) => {
      if (data.playerId === socket.id) {
        setComboMultiplier(data.combo);
      }
    });

    // 连击模式：重置连击
    socket.on("combo_reset", () => {
      setComboMultiplier(1);
    });

    socket.on("game_over", (data) => {
      setLeaderboard(data.leaderboard);
      setGameStarted(false);
      setComboMultiplier(1);
      setRelayInfo({ current: 0, total: 0, isGuessing: false });
    });

    socket.on("draw_data", (data) => {
      // 盲画模式：画家不渲染自己的绘制
      if (gameMode === 'blind' && isDrawer) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    });

    socket.on("fill_canvas", (data) => {
      // 盲画模式：画家不渲染自己的填充
      if (gameMode === 'blind' && isDrawer) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      floodFill(ctx, data.x, data.y, data.color, canvas.width, canvas.height);
    });

    socket.on("draw_shape", (data) => {
      // 盲画模式：画家不渲染自己的形状
      if (gameMode === 'blind' && isDrawer) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (data.shape === 'rect') {
        ctx.strokeRect(data.x, data.y, data.width, data.height);
      } else if (data.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(data.x, data.y, data.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (data.shape === 'line') {
        ctx.beginPath();
        ctx.moveTo(data.x1, data.y1);
        ctx.lineTo(data.x2, data.y2);
        ctx.stroke();
      } else if (data.shape === 'arrow') {
        const angle = Math.atan2(data.y2 - data.y1, data.x2 - data.x1);

        ctx.beginPath();
        ctx.moveTo(data.x1, data.y1);
        ctx.lineTo(data.x2, data.y2);
        ctx.lineTo(data.x2 - data.headLength * Math.cos(angle - Math.PI / 6), data.y2 - data.headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(data.x2, data.y2);
        ctx.lineTo(data.x2 - data.headLength * Math.cos(angle + Math.PI / 6), data.y2 - data.headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    });

    socket.on("clear_canvas", () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      // Reset history when canvas is cleared by drawer
      if (!isDrawer) {
        setHistory([]);
        setHistoryIndex(-1);
      }
    });

    socket.on("undo", () => {
      if (!isDrawer) {
        // Viewer: just clear the canvas, drawer will send the new state
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    });

    socket.on("redo", () => {
      if (!isDrawer) {
        // Viewer: similar to undo
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    });

    // Sticker events
    socket.on("add_sticker", (data) => {
      setPlacedStickers([...placedStickers, data.sticker]);
    });

    socket.on("update_sticker", (data) => {
      setPlacedStickers(placedStickers.map(sticker =>
        sticker.id === data.stickerId ? { ...sticker, ...data.updates } : sticker
      ));
    });

    socket.on("delete_sticker", (data) => {
      setPlacedStickers(placedStickers.filter(s => s.id !== data.stickerId));
    });

    // ============== Phase 2 & 3: 新功能事件监听 ==============
    
    // 用户统计
    socket.on("user_stats", (stats) => {
      setUserStats(stats);
    });
    
    // 成就解锁
    socket.on("achievement_unlocked", (newAchievements) => {
      setAchievements(prev => [...prev, ...newAchievements]);
      if (newAchievements.length > 0) {
        setNewAchievement(newAchievements[0]);
        playSound('achievement', volume, soundEnabled);
        // 3秒后隐藏通知
        setTimeout(() => setNewAchievement(null), 3000);
      }
    });
    
    // 成就更新
    socket.on("achievements_update", (unlockedAchievements) => {
      setAchievements(unlockedAchievements);
    });
    
    // 每日挑战
    socket.on("daily_challenges", (data) => {
      setDailyChallenges(data.challenges);
      setChallengeProgress(data.progress);
    });
    
    // 合作模式回合
    socket.on("collaborative_round", (data) => {
      setGameStarted(true);
      const isCollaborator = data.drawerIds.includes(socket.id);
      setIsDrawer(isCollaborator);
      setTimeLeft(data.roundTime);
      setMaxTime(data.roundTime);
      setTurnInfo({ current: data.turnCurrent, total: data.turnTotal });
      setCollaborativeInfo({ drawers: data.drawerIds, isDrawing: true });
      setRelayInfo({ current: 0, total: 0, isGuessing: false });
      
      if (isCollaborator) {
        setRoundInfo(`合作绘画中... (共 ${data.drawerIds.length} 位画家)`);
      } else {
        setRoundInfo(`观看 ${data.drawers} 合作画画...`);
      }
      
      // 重置画布
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // 重置历史
      setHistory([]);
      setHistoryIndex(-1);
      setPlacedStickers([]);
    });

    return () => {
      socket.off("receive_message");
      socket.off("draw_data");
      socket.off("draw_shape");
      socket.off("fill_canvas");
      socket.off("clear_canvas");
      socket.off("undo");
      socket.off("redo");
      socket.off("update_players");
      socket.off("new_round");
      socket.off("relay_segment");
      socket.off("relay_guessing");
      socket.off("collaborative_round");
      socket.off("your_turn");
      socket.off("timer_update");
      socket.off("correct_guess");
      socket.off("combo_update");
      socket.off("combo_reset");
      socket.off("game_over");
      socket.off("user_stats");
      socket.off("achievement_unlocked");
      socket.off("achievements_update");
      socket.off("daily_challenges");
    };
  }, [triggerWinEffect, gameMode, soundEnabled, volume, placedStickers]);

  // Initialize canvas with white background
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [isJoined]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDrawer || !gameStarted) return;

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawer, gameStarted, history, historyIndex]);

  const colors = [
    '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#8b5cf6', '#ec4899', '#78716c', '#ffffff'
  ];

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">

      {/* Podium Modal */}
      {leaderboard && <Podium leaderboard={leaderboard} onRestart={restartGame} />}

      {!isJoined ? (
        // ============== Login Screen ==============
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-xl">
              <Palette className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              你画我猜
            </h1>
            <p className="text-slate-500 mt-2">创意绘画 · 实时互动 · 欢乐派对</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">昵称</label>
              <input
                type="text"
                placeholder="给自己起个好听的名字"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">房间号</label>
              <input
                type="text"
                placeholder="例如: 888"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                onChange={(e) => setRoom(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">词库类型</label>
              <select
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="mix">🎲 综合词库</option>
                <option value="animals">🦁 动物世界</option>
                <option value="food">🍔 美食天地</option>
                <option value="items">⌚️ 日常用品</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">游戏模式</label>
              <select
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value)}
              >
                <option value="classic">🎨 经典模式 (60秒)</option>
                <option value="lightning">⚡ 闪电模式 (30秒)</option>
                <option value="combo">🎯 连击模式 (连续答对倍数加分)</option>
                <option value="relay">🏃 接力模式 (多人接力画画)</option>
                <option value="blind">🤪 盲画模式 (画家看不到自己的画)</option>
                <option value="collaborative">🤝 合作模式 (多人同时绘画)</option>
              </select>
            </div>

            <button
              onClick={joinRoom}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-lg mt-2"
            >
              加入游戏
            </button>
          </div>
        </div>
      ) : (
        // ============== Game Screen ==============
        <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl h-[95vh]">

          {/* Left: Player List */}
          <div className="w-full lg:w-64 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col border border-white/50 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-5 h-5" /> 玩家 ({players.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {players.sort((a, b) => b.score - a.score).map((p, idx) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  idx === 0 && p.score > 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' : 'bg-slate-50'
                }`}>
                  <div className="relative">
                    <img
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${p.avatarSeed}`}
                      className="w-10 h-10 rounded-full bg-white shadow-sm"
                      alt=""
                    />
                    {idx === 0 && p.score > 0 && (
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-400 absolute -top-1 -right-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-700 truncate text-sm flex items-center gap-1">
                      {p.username}
                      {p.id === socket.id && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">我</span>}
                    </div>
                    <div className="text-xs text-slate-400">{p.score} 分</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100">
              {!gameStarted && players.length >= 2 && (
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl transition shadow-lg hover:shadow-green-200 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" /> 开始游戏
                </button>
              )}
              {!gameStarted && players.length < 2 && (
                <div className="text-center text-sm text-slate-400 p-3 bg-slate-50 rounded-xl">
                  等待玩家加入...
                </div>
              )}
              {gameStarted && (
                <div className="text-center text-sm font-bold text-purple-600 p-2 bg-purple-50 rounded-xl">
                  第 {turnInfo.current} / {turnInfo.total} 轮
                </div>
              )}
            </div>
          </div>

          {/* Center: Canvas Area */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Header / Timer */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 flex flex-col sm:flex-row justify-between items-center gap-3 relative overflow-hidden">
              {gameStarted && (
                <div
                  className={`absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-linear ${
                    timeLeft < 10 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-green-400 to-blue-500'
                  }`}
                  style={{ width: `${(timeLeft / maxTime) * 100}%` }}
                />
              )}

              <div className="flex items-center gap-3 z-10">
                <div className={`p-2 rounded-xl ${timeLeft < 10 ? 'bg-red-100 animate-pulse' : 'bg-slate-100'}`}>
                  <Timer className={`w-6 h-6 ${timeLeft < 10 ? 'text-red-500' : 'text-slate-600'}`} />
                </div>
                <div className={`font-mono text-2xl font-bold ${timeLeft < 10 ? 'text-red-500' : 'text-slate-700'}`}>
                  {timeLeft}s
                </div>
              </div>

              <div className="flex-1 text-center z-10">
                {isDrawer ? (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">你的题目</span>
                    <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                      {currentWord || "等待中..."}
                    </span>
                    {gameMode === 'relay' && relayInfo.current > 0 && (
                      <span className="text-xs text-purple-600 font-bold mt-1">
                        接力 {relayInfo.current}/{relayInfo.total}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">提示</span>
                    <span className="text-xl font-bold text-slate-600">
                      {gameStarted ? (
                        relayInfo.isGuessing ? "猜猜看！" :
                        currentWord ? `${currentWord.length} 个字` : "猜猜看！"
                      ) : "准备开始"}
                    </span>
                    {gameMode === 'combo' && comboMultiplier > 1 && (
                      <span className="text-xs font-black text-orange-600 mt-1 animate-pulse">
                        🔥 {comboMultiplier}x 连击！
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="z-10 flex flex-col items-end gap-1">
                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                  isDrawer ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {isDrawer ? (gameMode === 'collaborative' ? "🎨 合作画家" : "🎨 画家") : "🤔 猜题者"}
                </div>
                {gameMode !== 'classic' && (
                  <div className="text-[10px] font-bold text-slate-500 px-2">
                    {gameMode === 'lightning' && '⚡ 闪电'}
                    {gameMode === 'combo' && '🎯 连击'}
                    {gameMode === 'relay' && '🏃 接力'}
                    {gameMode === 'blind' && '🤪 盲画'}
                    {gameMode === 'collaborative' && '🤝 合作'}
                  </div>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden relative border-4 border-slate-100">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-full touch-none absolute top-0 left-0"
              />
              <canvas
                ref={previewCanvasRef}
                width={800}
                height={600}
                className="w-full h-full touch-none absolute top-0 left-0 pointer-events-none"
              />
              <div
                ref={stickerDropZoneRef}
                className={`w-full h-full absolute top-0 left-0 ${
                  isDrawer
                    ? (tool === 'bucket' ? 'cursor-cell' : 'cursor-crosshair')
                    : (gameMode === 'relay' && relayInfo.isGuessing)
                      ? 'cursor-default pointer-events-none'
                      : 'cursor-default pointer-events-none'
                }`}
                onClick={handleCanvasClick}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onDrop={handleStickerDrop}
                onDragOver={handleStickerDragOver}
              />
              {!isDrawer && gameStarted && !relayInfo.isGuessing && (
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                  👀 观看模式
                </div>
              )}
              {relayInfo.isGuessing && (
                <div className="absolute top-3 right-3 bg-purple-500 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse">
                  💭 猜词时间！
                </div>
              )}
              {gameMode === 'blind' && isDrawer && gameStarted && (
                <div className="absolute top-3 left-3 bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse">
                  🤪 盲画模式：你看不到自己的画！
                </div>
              )}
              {gameMode === 'blind' && !isDrawer && gameStarted && (
                <div className="absolute top-3 left-3 bg-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-bold">
                  👁️ 观察者：正常观看画家创作
                </div>
              )}
              {gameMode === 'collaborative' && gameStarted && (
                <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse">
                  🤝 合作模式：大家一起画！
                </div>
              )}
            </div>

            {/* Achievement Unlock Notification */}
            {newAchievement && (
              <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-bounce">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{newAchievement.icon}</span>
                  <div>
                    <div className="font-bold text-lg">🏆 成就解锁！</div>
                    <div className="text-sm">{newAchievement.name}</div>
                    <div className="text-xs opacity-80">{newAchievement.desc}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Toolbar */}
            {isDrawer && (
              <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3 overflow-x-auto">
                  {/* Tools */}
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => setTool('pen')}
                      className={`p-2.5 rounded-lg transition ${tool === 'pen' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="画笔"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTool('eraser')}
                      className={`p-2.5 rounded-lg transition ${tool === 'eraser' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="橡皮擦"
                    >
                      <Eraser className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTool('bucket')}
                      className={`p-2.5 rounded-lg transition ${tool === 'bucket' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="油漆桶"
                    >
                      <PaintBucket className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="w-px h-8 bg-slate-200"></div>

                  {/* Shape Tools */}
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => setTool('rect')}
                      className={`p-2.5 rounded-lg transition ${tool === 'rect' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="矩形"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTool('circle')}
                      className={`p-2.5 rounded-lg transition ${tool === 'circle' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="圆形"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTool('line')}
                      className={`p-2.5 rounded-lg transition ${tool === 'line' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="直线"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTool('arrow')}
                      className={`p-2.5 rounded-lg transition ${tool === 'arrow' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                      title="箭头"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="w-px h-8 bg-slate-200"></div>

                  {/* Sticker Button */}
                  <button
                    onClick={() => setStickerPanelOpen(!stickerPanelOpen)}
                    className={`p-2.5 rounded-lg transition ${stickerPanelOpen ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    title="贴纸"
                  >
                    <Sticker className="w-5 h-5" />
                  </button>

                  <div className="w-px h-8 bg-slate-200"></div>

                  {/* Colors */}
                  <div className="flex gap-1.5 items-center">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
                        className={`w-7 h-7 rounded-full border-2 transition transform ${
                          color === c && tool !== 'eraser'
                            ? 'border-slate-800 scale-110 shadow-md'
                            : 'border-slate-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <div className="w-px h-8 bg-slate-200"></div>

                  {/* Size */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">粗细</span>
                    <input
                      type="range"
                      min="2" max="24"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="w-20 accent-slate-600 cursor-pointer"
                    />
                    <div
                      className="rounded-full bg-slate-800"
                      style={{ width: lineWidth, height: lineWidth }}
                    ></div>
                  </div>
                </div>

                {/* Undo/Redo buttons */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className={`p-2.5 rounded-lg transition ${historyIndex > 0 ? 'bg-white shadow text-slate-600 hover:text-blue-600' : 'text-slate-300 cursor-not-allowed'}`}
                    title="撤销 (Ctrl+Z)"
                  >
                    <Undo className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className={`p-2.5 rounded-lg transition ${historyIndex < history.length - 1 ? 'bg-white shadow text-slate-600 hover:text-blue-600' : 'text-slate-300 cursor-not-allowed'}`}
                    title="重做 (Ctrl+Y)"
                  >
                    <Redo className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={clearCanvas}
                  className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition flex items-center gap-2 font-semibold"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="hidden sm:inline">清空</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="w-full lg:w-72 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex flex-col border border-white/50 overflow-hidden h-[280px] lg:h-auto">
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> 聊天
              </h3>
              <span className="text-xs font-medium text-slate-400">房间 {room}</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50/50">
              {messageList.map((msg, index) => {
                const isMe = msg.author === username;
                const isSystem = msg.isSystem;

                if (isSystem) {
                  return (
                    <div key={index} className="flex justify-center my-2">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${
                        msg.type === 'success' ? 'bg-green-100 text-green-700' :
                        msg.type === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={index} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-slate-700 border border-slate-100 rounded-bl-sm"
                    }`}>
                      {!isMe && <p className="text-[10px] font-bold mb-0.5 opacity-50">{msg.author}</p>}
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  placeholder={
                    isDrawer ? "🤫 你是画家..." :
                    (gameMode === 'relay' && relayInfo.current > 0 && !relayInfo.isGuessing) ? "🤫 接力中..." :
                    (gameMode === 'relay' && relayInfo.isGuessing) ? "猜猜这幅画是什么！" :
                    "输入答案..."
                  }
                  disabled={isDrawer || (gameMode === 'relay' && relayInfo.current > 0 && !relayInfo.isGuessing)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 text-sm"
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={isDrawer || !currentMessage.trim() || (gameMode === 'relay' && relayInfo.current > 0 && !relayInfo.isGuessing)}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticker Panel */}
          {stickerPanelOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Sticker className="w-6 h-6 text-purple-600" /> 贴纸库
                  </h2>
                  <button
                    onClick={() => setStickerPanelOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Search */}
                <div className="mb-4 relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索贴纸..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {Object.keys(STICKER_CATEGORIES).map(category => (
                    <button
                      key={category}
                      onClick={() => setStickerCategory(category)}
                      className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition ${
                        stickerCategory === category
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {STICKER_CATEGORIES[category].name}
                    </button>
                  ))}
                </div>

                {/* Stickers Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                    {getStickersByCategory(stickerCategory)
                      .filter(emoji =>
                        searchQuery === '' ||
                        emoji.includes(searchQuery)
                      )
                      .map((emoji, index) => (
                        <button
                          key={index}
                          draggable
                          onDragStart={(e) => handleStickerDragStart(e, emoji)}
                          onClick={() => {
                            // 快速添加到画布中心
                            const canvas = canvasRef.current;
                            if (canvas && isDrawer) {
                              addSticker(emoji, canvas.width / 2, canvas.height / 2);
                            }
                          }}
                          className="w-10 h-10 text-3xl hover:bg-slate-100 rounded-lg transition flex items-center justify-center cursor-move active:scale-95"
                          title="拖拽到画布或点击添加"
                        >
                          {emoji}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                  💡 提示：拖拽贴纸到画布上放置，或点击直接添加到中心位置
                </div>
              </div>
            </div>
          )}

          {/* ============== Phase 2 & 3: 新功能面板 ============== */}
          
          {/* 成就面板 */}
          {showAchievementPanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" /> 成就
                  </h2>
                  <button onClick={() => setShowAchievementPanel(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                {/* 用户统计 */}
                {userStats && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{userStats.wins || 0}</div>
                        <div className="text-xs text-slate-500">胜利</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{userStats.correctGuesses || 0}</div>
                        <div className="text-xs text-slate-500">猜对</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{userStats.totalScore || 0}</div>
                        <div className="text-xs text-slate-500">总分</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 成就列表 */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {achievements.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">开始游戏来解锁成就吧！</div>
                  ) : (
                    achievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="text-3xl">{achievement.icon}</span>
                        <div>
                          <div className="font-bold text-slate-700">{achievement.name}</div>
                          <div className="text-xs text-slate-500">{achievement.desc}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* 每日挑战面板 */}
          {showChallengePanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-6 h-6 text-orange-500" /> 每日挑战
                  </h2>
                  <button onClick={() => setShowChallengePanel(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {dailyChallenges.map((challenge) => {
                    const progress = challengeProgress[challenge.id] || { current: 0, completed: false, claimed: false };
                    return (
                      <div key={challenge.id} className={`p-4 rounded-xl ${progress.completed ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-700">{challenge.name}</div>
                            <div className="text-sm text-slate-500">{challenge.desc}</div>
                            <div className="text-xs text-orange-600 font-bold mt-1">🎁 {challenge.reward} 分奖励</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-600">{progress.current}/{challenge.target}</div>
                            {progress.completed && !progress.claimed && (
                              <button 
                                onClick={() => {
                                  // 领取奖励
                                  fetch(`${SOCKET_URL}/api/daily-challenges/claim`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: socket.id, challengeId: challenge.id })
                                  }).then(() => {
                                    playSound('achievement', volume, soundEnabled);
                                  });
                                }}
                                className="mt-1 px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition"
                              >
                                领取
                              </button>
                            )}
                            {progress.claimed && (
                              <span className="text-green-600 text-xs">✓ 已领取</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                            style={{ width: `${Math.min(100, (progress.current / challenge.target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* 主题面板 */}
          {showThemePanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Palette className="w-6 h-6 text-purple-500" /> 主题
                  </h2>
                  <button onClick={() => setShowThemePanel(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCurrentTheme(key);
                        playSound('button', volume, soundEnabled);
                      }}
                      className={`p-4 rounded-xl border-2 transition ${
                        currentTheme === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{theme.icon}</div>
                      <div className="font-bold text-slate-700">{theme.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 设置面板（音效） */}
          {showSettingsPanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-slate-500" /> 设置
                  </h2>
                  <button onClick={() => setShowSettingsPanel(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                {/* 音效开关 */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-500" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                    <span className="font-medium text-slate-700">音效</span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition ${soundEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                
                {/* 音量调节 */}
                {soundEnabled && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-700">音量</span>
                      <span className="text-sm text-slate-500">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 快捷按钮栏 */}
          {isJoined && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl z-40">
              <button
                onClick={() => setShowAchievementPanel(true)}
                className="p-3 hover:bg-slate-100 rounded-xl transition"
                title="成就"
              >
                <Trophy className="w-5 h-5 text-yellow-500" />
              </button>
              <button
                onClick={() => setShowChallengePanel(true)}
                className="p-3 hover:bg-slate-100 rounded-xl transition"
                title="每日挑战"
              >
                <Target className="w-5 h-5 text-orange-500" />
              </button>
              <button
                onClick={() => setShowThemePanel(true)}
                className="p-3 hover:bg-slate-100 rounded-xl transition"
                title="主题"
              >
                <Palette className="w-5 h-5 text-purple-500" />
              </button>
              <button
                onClick={() => setShowSettingsPanel(true)}
                className="p-3 hover:bg-slate-100 rounded-xl transition"
                title="设置"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-500" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;
