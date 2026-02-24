# Pictionary - 你画我猜

一个实时多人在线的"你画我猜"游戏，使用 React + Socket.io 构建。

## 功能特性

### 🎮 多种游戏模式
- 🎨 经典模式：60秒标准玩法
- ⚡ 闪电模式：30秒快节奏，高分奖励
- 🎯 连击模式：连续答对倍数加分
- 🏃 接力模式：多人协作画画
- 🤪 盲画模式：画家看不到自己的画（新增）

### 🎨 画布工具 (Phase 1 新增)
- ✏️ 画笔工具
- 🧹 橡皮擦
- 🪣 油漆桶
- 🔷 形状工具（矩形、圆形、直线、箭头）
- 🎭 贴纸库（50+ 贴纸，5 大分类）
- ↩️ 撤销/重做 (支持 Ctrl+Z / Ctrl+Y 快捷键)
- 🎨 颜色选择器
- 📏 线条粗细调节

### 📚 多种词库
- 综合词库
- 动物世界
- 美食天地
- 日常用品

### 💬 其他功能
- 实时多人游戏
- 实时聊天和猜词
- 游戏结束排行榜
- 精美的 UI 和动画效果

## 🆕 Phase 1 更新 (2026-02-24) - 100% 完成

### 新增功能
1. **撤销/重做系统** ✅
   - 最多支持 50 步历史记录
   - 支持键盘快捷键 (Ctrl+Z / Ctrl+Y)
   - 实时同步到所有玩家
   - 适用于所有绘制操作

2. **形状工具** ✅
   - 矩形工具
   - 圆形工具
   - 直线工具
   - 箭头工具
   - 实时拖拽预览
   - 多人实时同步

3. **贴纸库** ✅
   - 50+ Emoji 贴纸
   - 5 个分类（表情、动物、食物、物品、标记）
   - 拖拽放置 + 点击添加
   - 搜索功能
   - 实时同步

4. **盲画模式** ✅
   - 画家看不到自己的笔触
   - 增加游戏难度和趣味性
   - 高分奖励机制
   - 观察者正常观看

### 技术改进
- Canvas 状态持久化
- Socket 事件同步
- 性能优化的历史记录
- 双 Canvas 架构（主画布 + 预览层）
- 盲画模式渲染逻辑

### 技术改进
- Canvas 状态持久化
- Socket 事件同步
- 性能优化的历史记录

## 📋 升级计划

### Phase 1 (已完成) ✅
- [x] 撤销/重做功能
- [x] 形状工具 (矩形、圆形、直线、箭头）
- [x] 贴纸库 (50+ 贴纸，5 个分类）
- [x] 盲画模式

### Phase 2 (待开发)
- [ ] 成就系统
- [ ] 每日挑战
- [ ] 用户自定义词库
- [ ] 合作绘画模式

### Phase 3 (待开发)
- [ ] 好友系统
- [ ] 多主题皮肤
- [ ] 音效系统
- [ ] AI 评分

详细升级计划请查看 [UPGRADE_PLAN.md](./UPGRADE_PLAN.md)

## 技术栈

- **前端**: React 19, Vite, TailwindCSS, Socket.io-client
- **后端**: Node.js, Express, Socket.io
- **部署**: Docker, GitHub Actions, Nginx

## 快速开始

### 本地开发

```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install

# 启动后端 (端口 3001)
cd ../server && node index.js

# 启动前端 (新终端，端口 5173)
cd ../client && npm run dev
```

## Docker 部署

### 方式一：使用预构建镜像（推荐）

```bash
# 拉取并启动服务
docker-compose up -d

# 访问 http://localhost
```

### 方式二：本地构建

```bash
# 使用开发版 docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

### 方式三：生产环境（带 Nginx 反向代理）

```bash
# 使用生产版 docker-compose
docker-compose -f docker-compose.prod.yml up -d

# 访问 http://localhost
```

## 环境变量

### 前端
- `VITE_SOCKET_URL`: Socket.io 服务器地址（生产环境会自动检测）

### 后端
- `PORT`: 服务器端口（默认 3001）
- `NODE_ENV`: 环境模式（development/production）

## Docker 镜像

镜像托管在 GitHub Container Registry：

- 前端: `ghcr.io/corps-cy/pictionary-client:latest`
- 后端: `ghcr.io/corps-cy/pictionary-server:latest`

### 手动拉取镜像

```bash
docker pull ghcr.io/corps-cy/pictionary-client:latest
docker pull ghcr.io/corps-cy/pictionary-server:latest
```

## 游戏模式详解

### 🎨 经典模式
传统的你画我猜玩法，每轮一名玩家绘画，其他人猜测。适合所有玩家，节奏适中。

### ⚡ 闪电模式
30秒的快节奏模式，猜对得分更高。需要快速反应和精准绘画，适合喜欢挑战的玩家。

### 🎯 连击模式
通过连续答对获得倍数加分，最高可达5倍分数。鼓励玩家持续参与，避免长时间沉默。

### 🏃 接力模式
3名玩家轮流在同一幅画上创作，每人30秒。接力完成后大家一起猜最终作品。强调团队协作和创意叠加。

## 项目结构

```
Pictionary/
├── client/                 # React 前端
│   ├── src/
│   │   └── App.jsx        # 主应用组件
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Node.js 后端
│   ├── index.js           # 服务器入口
│   └── Dockerfile
├── nginx/                  # Nginx 配置
│   └── nginx.conf
├── .github/
│   └── workflows/
│       └── docker-publish.yml  # CI/CD 工作流
├── docker-compose.yml      # 基础部署
├── docker-compose.dev.yml  # 开发环境
└── docker-compose.prod.yml # 生产环境
```

## 游戏规则

### 通用规则
1. 创建或加入一个房间，选择词库和游戏模式
2. 至少需要 2 名玩家开始游戏
3. 猜对的玩家和画家都会获得积分
4. 游戏结束时积分最高者获胜

### 🎨 经典模式
- 每轮一名玩家画画，其他人猜词
- 60秒时间限制
- 猜对得分：10-30分（根据剩余时间）
- 画家得分：5分

### ⚡ 闪电模式
- 快节奏玩法，每轮30秒
- 猜对得分更高：20-40分
- 画家得分：10分
- 适合喜欢挑战的玩家

### 🎯 连击模式
- 连续答对获得倍数加分
- 第1题：1倍，第2题：2倍，第3题：3倍...最高5倍
- 答错或超时清零连击
- 鼓励持续参与和快速反应

### 🏃 接力模式
- 3名玩家轮流在同一幅画上创作
- 每人30秒，轮流添加内容
- 接力完成后，其他玩家猜作品内容
- 所有接力画家获得3分，猜对者获得15-30分
- 考验团队协作和创意传递

## License

MIT
