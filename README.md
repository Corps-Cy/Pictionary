# Pictionary - 你画我猜

一个实时多人在线的"你画我猜"游戏，使用 React + Socket.io 构建。

## 功能特性

- 🎮 **多种游戏模式**：
  - 🎨 经典模式：60秒标准玩法
  - ⚡ 闪电模式：30秒快节奏，高分奖励
  - 🎯 连击模式：连续答对倍数加分
  - 🏃 接力模式：多人协作画画
- 实时多人游戏
- 多种词库分类（综合、动物、美食、日常用品）
- 画布工具（画笔、橡皮擦、油漆桶、颜色选择）
- 实时聊天和猜词
- 游戏结束排行榜
- 精美的 UI 和动画效果

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
