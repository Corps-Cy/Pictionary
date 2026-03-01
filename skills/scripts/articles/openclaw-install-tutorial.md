# OpenClaw 安装教程：从零开始打造你的 AI 助手

## 为什么选择 OpenClaw

如果你正在寻找一个**隐私可控、功能强大、易于扩展**的 AI 助手平台，OpenClaw 可能是你的最佳选择。

### 它是什么？

OpenClaw 是一个开源的 AI 助手网关，让你能够：
- **统一接入**多种 AI 模型（ChatGPT、Claude、智谱、通义千问等）
- **多渠道通信**（Telegram、Discord、WhatsApp、微信、邮件等）
- **自动化任务**（定时执行、Webhook 触发、API 调用）
- **完全自主**（本地运行、数据不离开你的服务器）

### 与其他工具的对比

| 特性 | OpenClaw | ChatGPT Plus | Claude Pro |
|------|---------|--------------|------------|
| 多模型切换 | ✅ 支持 20+ 模型 | ❌ 仅 OpenAI | ❌ 仅 Anthropic |
| 多渠道通信 | ✅ 10+ 渠道 | ❌ 仅网页 | ❌ 仅网页 |
| 自动化任务 | ✅ Cron + API | ❌ 不支持 | ❌ 不支持 |
| 私有部署 | ✅ 完全本地 | ❌ 云端 | ❌ 云端 |
| 费用 | 免费 + 按需 API | $20/月 | $20/月 |

### 适用场景

- 🔧 **开发者**：自动化代码审查、CI/CD 集成、文档生成
- 🏢 **企业用户**：内部知识库、客服机器人、流程自动化
- 📱 **个人用户**：智能日程管理、消息转发、内容聚合
- 🔬 **研究者**：多模型对比实验、自定义工具链

---

## 安装前的准备工作

### 系统要求

在开始之前，确保你的系统满足以下最低要求：

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **Node.js** | 22.0.0+ | 22.12.0+ |
| **操作系统** | macOS / Linux / Windows (WSL2) | macOS 14+ / Ubuntu 22.04+ |
| **内存** | 512MB | 2GB+ |
| **磁盘** | 200MB | 1GB+（含日志和缓存）|

![终端检查环境](IMAGE_PLACEHOLDER:macOS 终端窗口，显示 node -v 命令输出 v22.12.0，以及 openclaw --version 命令)

### 检查当前环境

打开终端（Terminal），运行以下命令检查 Node.js 版本：

```bash
# 检查 Node.js 版本
node --version

# 期望输出类似：
# v22.12.0
```

如果输出显示版本号低于 `v22.0.0`，你需要先升级 Node.js。

### 升级 Node.js（如果需要）

**macOS（使用 Homebrew）：**
```bash
brew install node@22
```

**Linux（使用 NodeSource）：**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL/Fedora
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
```

**Windows（使用安装器）：**
1. 访问 https://nodejs.org/
2. 下载 Node.js 22.x LTS 版本
3. 运行安装程序

> **💡 提示**：Windows 用户强烈建议使用 **WSL2**（Windows Subsystem for Linux）来获得最佳体验。参考 [WSL2 安装指南](https://learn.microsoft.com/zh-cn/windows/wsl/install)。

---

## 三种安装方式详解

OpenClaw 提供了三种安装方式，满足不同用户的需求：

### 方式一：一键安装脚本（推荐）⭐

这是**最简单、最快速**的安装方式，适合大多数用户。

#### macOS / Linux / WSL2

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

![安装脚本执行](IMAGE_PLACEHOLDER:macOS 终端窗口，显示 curl 安装脚本正在执行，包含进度条和成功消息)

**这个命令会做什么？**
1. ✅ 检测你的操作系统
2. ✅ 自动安装 Node.js（如果缺失或版本过低）
3. ✅ 通过 npm 全局安装 OpenClaw
4. ✅ 启动配置向导（onboarding wizard）

#### Windows (PowerShell)

以**管理员身份**打开 PowerShell，运行：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

![Windows 安装过程](IMAGE_PLACEHOLDER:Windows PowerShell 窗口，显示安装脚本执行过程，包含进度信息)

**PowerShell 安装说明：**
- 如果遇到执行策略限制，运行：`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 脚本会自动通过 winget、Chocolatey 或 Scoop 安装 Node.js
- 安装完成后，重启 PowerShell 窗口

#### 跳过配置向导（CI/自动化场景）

如果你在自动化脚本中使用，可以跳过交互式配置：

```bash
# macOS/Linux
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```

---

### 方式二：npm 全局安装

如果你已经安装了 Node.js 22+，并且习惯手动管理，可以选择这种方式。

```bash
npm install -g openclaw@latest
```

#### 验证安装

```bash
# 检查安装是否成功
openclaw --version

# 期望输出类似：
# openclaw/1.2.3 linux-x64 node-v22.12.0
```

![npm 安装成功](IMAGE_PLACEHOLDER:终端窗口，显示 npm install -g openclaw@latest 的完整输出，包含下载进度和安装路径)

#### 运行初始化向导

```bash
openclaw onboard --install-daemon
```

这个命令会：
1. 引导你配置 AI 模型提供商（OpenAI、Anthropic 等）
2. 设置 Gateway 服务
3. 可选：配置消息渠道（Telegram、Discord 等）
4. 安装为系统服务（开机自启）

#### 常见错误处理

**❌ EACCES 权限错误**
```bash
# 错误信息
npm ERR! Error: EACCES: permission denied

# 解决方案 1：使用 sudo（不推荐）
sudo npm install -g openclaw@latest

# 解决方案 2：修改 npm 全局路径（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc  # 或 ~/.bashrc
source ~/.zshrc
npm install -g openclaw@latest
```

**❌ sharp/libvips 构建错误**
```bash
# 在 macOS 上，如果有全局 libvips
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

---

### 方式三：从源码编译（开发者）

如果你想体验最新的开发版功能，或想为 OpenClaw 贡献代码，可以从源码编译。

#### 克隆仓库

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

#### 安装依赖

OpenClaw 使用 **pnpm** 作为包管理器：

```bash
# 如果没有 pnpm，先安装
npm install -g pnpm

# 安装项目依赖
pnpm install
```

#### 构建项目

```bash
# 构建前端 UI
pnpm ui:build

# 构建后端
pnpm build
```

![源码编译流程](IMAGE_PLACEHOLDER:终端窗口，显示 pnpm install 和 pnpm build 的完整输出，包含编译进度和成功消息)

#### 链接到全局

```bash
# 使 openclaw 命令全局可用
pnpm link --global
```

#### 运行初始化

```bash
openclaw onboard --install-daemon
```

> **🔧 开发者提示**：从源码运行时，你可以在项目目录下直接使用 `pnpm openclaw <command>`，无需全局链接。

---

## 初始化配置

安装完成后，需要运行一次**配置向导**来设置你的 AI 助手。

### 运行 Onboarding 向导

```bash
openclaw onboard --install-daemon
```

![Onboarding 向导](IMAGE_PLACEHOLDER:终端窗口，显示交互式配置向导界面，包含多个步骤：选择模型提供商、输入 API Key、设置 Gateway 端口等)

### 配置向导会询问的内容

1. **AI 模型提供商**
   - OpenAI（ChatGPT）
   - Anthropic（Claude）
   - 智谱 AI（GLM）
   - 阿里云（通义千问）
   - 本地模型（Ollama）

2. **API 密钥**
   - 向导会引导你获取各提供商的 API Key
   - 密钥存储在本地，**不会上传到云端**

3. **Gateway 设置**
   - 默认端口：`18789`
   - 认证方式（JWT token）

4. **可选：消息渠道**
   - Telegram Bot
   - Discord Bot
   - WhatsApp
   - 微信（需要额外配置）

### 验证安装

向导完成后，验证一切正常：

```bash
# 检查 Gateway 服务状态
openclaw gateway status

# 期望输出：
# ● openclaw-gateway.service - OpenClaw Gateway
#    Loaded: loaded (/etc/systemd/system/openclaw-gateway.service)
#    Active: active (running) since ...

# 检查配置问题
openclaw doctor

# 期望输出：
# ✅ Node version: 22.12.0
# ✅ Gateway is running
# ✅ Config is valid
```

![验证安装成功](IMAGE_PLACEHOLDER:终端窗口，显示 openclaw gateway status 和 openclaw doctor 命令的输出，所有检查项都显示绿色 ✅)

---

## 首次使用：打开 Control UI

OpenClaw 提供了一个**现代化的 Web 界面**，让你可以直观地管理你的 AI 助手。

### 启动 Dashboard

```bash
openclaw dashboard
```

这个命令会：
1. 启动 Gateway 服务（如果未运行）
2. 自动打开浏览器访问 `http://127.0.0.1:18789/`

![Control UI 界面](IMAGE_PLACEHOLDER:浏览器窗口，显示 OpenClaw Control UI 界面，包含聊天窗口、模型选择器、历史记录等元素)

### Control UI 功能介绍

- **💬 实时聊天**：直接在浏览器中与 AI 对话
- **🔄 模型切换**：一键切换不同的 AI 模型
- **📊 会话管理**：查看和管理历史对话
- **⚙️ 设置面板**：配置模型参数、API 密钥等
- **📱 多设备同步**：在任何设备上访问相同的会话

> **🎉 恭喜！** 到这一步，你已经成功安装并运行了 OpenClaw。接下来可以根据需求配置更多功能。

---

## 常见问题排查

### 问题 1：`openclaw: command not found`

**原因**：npm 全局安装路径不在系统 PATH 中。

**解决方案**：

```bash
# 1. 检查 npm 全局路径
npm prefix -g
# 输出类似：/usr/local 或 /home/user/.npm-global

# 2. 检查当前 PATH
echo $PATH

# 3. 如果 npm 路径不在 PATH 中，添加到 shell 配置
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc  # macOS/Linux
source ~/.zshrc

# Windows 用户：将 npm prefix -g 的输出添加到系统环境变量 PATH
```

### 问题 2：Node.js 版本过低

**症状**：
```
Error: OpenClaw requires Node.js 22 or higher
```

**解决方案**：
```bash
# 使用 nvm 快速切换版本
nvm install 22
nvm use 22
nvm alias default 22

# 或直接使用 Homebrew/apt
brew upgrade node@22  # macOS
sudo apt upgrade nodejs  # Linux
```

### 问题 3：网络代理问题

如果你在中国大陆或公司内网，可能需要配置代理：

```bash
# 临时使用代理
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# npm 配置代理
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080

# 或使用国内镜像
npm config set registry https://registry.npmmirror.com
```

### 问题 4：Windows 特有问题

**症状**：`npm error spawn git ENOENT`

**原因**：Git 未安装或不在 PATH 中。

**解决方案**：
1. 下载并安装 [Git for Windows](https://git-scm.com/download/win)
2. 重启 PowerShell
3. 重新运行安装命令

**症状**：`openclaw is not recognized`

**解决方案**：
```powershell
# 1. 检查 npm 路径
npm config get prefix

# 2. 将 <npm 路径> 添加到系统 PATH
#    Windows 设置 → 系统 → 高级系统设置 → 环境变量
#    在用户变量中找到 Path，添加：C:\Users\<用户名>\AppData\Roaming\npm

# 3. 重启 PowerShell
```

### 问题 5：Gateway 无法启动

**症状**：
```
Error: listen EADDRINUSE: address already in use :::18789
```

**解决方案**：
```bash
# 1. 检查端口占用
lsof -i :18789  # macOS/Linux
netstat -ano | findstr :18789  # Windows

# 2. 结束占用进程
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 3. 或使用其他端口
openclaw gateway --port 18790
```

![常见错误示例](IMAGE_PLACEHOLDER:终端窗口，显示几个常见错误信息及其解决方案，用红色和绿色标注)

---

## 下一步：探索更多功能

### 1. 连接消息渠道

OpenClaw 支持多种消息渠道，让你的 AI 助手无处不在：

```bash
# 配置 Telegram Bot
openclaw channel add telegram --token <YOUR_BOT_TOKEN>

# 配置 Discord Bot
openclaw channel add discord --token <YOUR_BOT_TOKEN>

# 查看所有支持的渠道
openclaw channel list
```

### 2. 设置定时任务

自动化你的工作流程：

```bash
# 每天早上 8 点生成日报
openclaw cron add "0 8 * * *" "生成今日工作计划"

# 每小时检查邮箱
openclaw cron add "0 * * * *" "检查未读邮件并摘要"
```

### 3. 配对移动设备

使用 OpenClaw Node 在手机上运行 AI 任务：

```bash
# 生成配对码
openclaw pairing generate

# 在移动设备上输入配对码
# 支持 iOS / Android
```

### 4. 探索 Skills 系统

Skills 是 OpenClaw 的插件系统，扩展 AI 的能力：

```bash
# 列出可用 Skills
openclaw skill list

# 安装天气 Skill
openclaw skill install weather

# 安装新闻聚合 Skill
openclaw skill install news-aggregator
```

### 5. 进阶资源

- 📚 **官方文档**：https://docs.openclaw.ai
- 💬 **社区论坛**：https://discord.gg/clawd
- 🛒 **Skill 商店**：https://clawhub.com
- 🐙 **GitHub 仓库**：https://github.com/openclaw/openclaw
- 🐛 **问题反馈**：https://github.com/openclaw/openclaw/issues

---

## 总结

恭喜你完成了 OpenClaw 的安装！🎉

在这个教程中，我们学习了：
- ✅ OpenClaw 的核心优势和应用场景
- ✅ 三种安装方式：脚本安装、npm 安装、源码编译
- ✅ 如何运行配置向导
- ✅ 验证安装和排查常见问题
- ✅ 探索更多高级功能

**接下来做什么？**
1. 打开 `openclaw dashboard`，开始你的第一次对话
2. 配置你喜欢的 AI 模型（推荐从 ChatGPT 或 Claude 开始）
3. 尝试连接一个消息渠道（Telegram 是最简单的）
4. 探索 Skills 系统，扩展 AI 的能力

**遇到问题？**
- 查看 [官方文档](https://docs.openclaw.ai)
- 加入 [Discord 社区](https://discord.gg/clawd) 寻求帮助
- 在 [GitHub](https://github.com/openclaw/openclaw/issues) 提交 Issue

OpenClaw 是一个**活跃开发**的开源项目，你的反馈和贡献都非常欢迎。让我们一起打造更好的 AI 助手体验！🚀
