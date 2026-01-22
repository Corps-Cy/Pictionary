import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { 
  Pencil, Eraser, Trash2, Send, Play, Users, 
  Palette, Timer, Crown, MessageCircle, PaintBucket, RotateCcw
} from 'lucide-react';

// In production with nginx proxy, use relative path. In dev, use localhost:3001
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");
const socket = io.connect(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

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

  // Chat State
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const chatEndRef = useRef(null);

  // Canvas State
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#3b82f6");
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'bucket'
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  const joinRoom = () => {
    if (username.trim() && room.trim()) {
      socket.emit("join_room", { room, username, category });
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
    socket.emit("clear_canvas", room);
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
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      floodFill(ctx, x, y, color, canvas.width, canvas.height);
      
      socket.emit("fill_canvas", { room, x, y, color });
    }
  };

  const startDrawing = (event) => {
    if (!isDrawer || tool === 'bucket') return;
    event.preventDefault();
    
    const { x, y } = getCoordinates(event);
    isDrawing.current = true;
    lastPos.current = { x, y };
  };

  const draw = (event) => {
    if (!isDrawing.current || !isDrawer || tool === 'bucket') return;
    event.preventDefault();

    const { x, y } = getCoordinates(event);
    const ctx = canvasRef.current.getContext("2d");
    
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

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

  const stopDrawing = () => {
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
      
      // Reset canvas to white
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });

    socket.on("your_turn", (word) => {
      setCurrentWord(word);
      setRoundInfo(`题目: ${word}`);
    });

    socket.on("timer_update", (time) => setTimeLeft(time));

    socket.on("correct_guess", (data) => {
      triggerWinEffect(data.effectType);
      setRoundInfo(`🎉 ${data.winner} 答对了！`);
    });

    socket.on("game_over", (data) => {
      setLeaderboard(data.leaderboard);
      setGameStarted(false);
    });

    socket.on("draw_data", (data) => {
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
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      floodFill(ctx, data.x, data.y, data.color, canvas.width, canvas.height);
    });

    socket.on("clear_canvas", () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("draw_data");
      socket.off("fill_canvas");
      socket.off("clear_canvas");
      socket.off("update_players");
      socket.off("new_round");
      socket.off("your_turn");
      socket.off("timer_update");
      socket.off("correct_guess");
      socket.off("game_over");
    };
  }, [triggerWinEffect]);

  // Initialize canvas with white background
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [isJoined]);

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
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">提示</span>
                    <span className="text-xl font-bold text-slate-600">
                      {gameStarted ? (currentWord ? `${currentWord.length} 个字` : "猜猜看！") : "准备开始"}
                    </span>
                  </div>
                )}
              </div>

              <div className="z-10">
                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                  isDrawer ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {isDrawer ? "🎨 画家" : "🤔 猜题者"}
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden relative border-4 border-slate-100">
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className={`w-full h-full touch-none ${
                  isDrawer 
                    ? (tool === 'bucket' ? 'cursor-cell' : 'cursor-crosshair') 
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
              />
              {!isDrawer && gameStarted && (
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                  👀 观看模式
                </div>
              )}
            </div>
            
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
                  placeholder={isDrawer ? "🤫 你是画家..." : "输入答案..."}
                  disabled={isDrawer}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 text-sm"
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button 
                  onClick={sendMessage}
                  disabled={isDrawer || !currentMessage.trim()}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;
