# Pictionary - 你画我猜

一个实时多人在线的"你画我猜"游戏，使用 React + Socket.io 构建。

## 功能特性

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

1. 创建或加入一个房间
2. 至少需要 2 名玩家开始游戏
3. 每轮一名玩家画画，其他人猜
4. 猜对的玩家和画家都会获得积分
5. 每人画一轮后游戏结束，积分最高者获胜

## License

MIT
