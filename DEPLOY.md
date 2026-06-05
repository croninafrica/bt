# 云端部署指南

部署后只需打开网址即可搜索，**无需在本机运行 Node**。

## 方式一：Render（推荐，有免费档）

1. 将项目推到 GitHub（见下方「首次上传」）
2. 打开 [render.com](https://render.com) 注册并登录
3. **New +** → **Blueprint** → 选择你的仓库
4. Render 会读取 `render.yaml`，自动用 Docker 构建
5. 部署完成后访问 `https://你的服务名.onrender.com`

免费实例闲置后会休眠，首次打开需等待约 30 秒唤醒。

## 方式二：Fly.io（全球节点，含新加坡）

```bash
# 安装 flyctl 后
cd 项目目录
fly launch    # 按提示操作，可选用 fly.toml 默认配置
fly deploy
```

访问 `https://你的应用.fly.dev`

## 方式三：Vercel

1. 将项目推到 GitHub
2. [vercel.com](https://vercel.com) → Import 项目
3. 框架选 **Other**，保持默认检测到 `vercel.json`
4. Deploy

API 与页面均通过 Serverless 转发，免费版有函数时长限制。

## 方式四：任意支持 Docker 的平台

构建并运行：

```bash
docker build -t magnet-search .
docker run -p 8080:8080 -e PORT=8080 magnet-search
```

浏览器打开 `http://localhost:8080`

---

## 首次上传到 GitHub

```powershell
cd D:\code\bt
git init
git add .
git commit -m "magnet search"
# 在 GitHub 新建空仓库后：
git remote add origin https://github.com/你的用户名/magnet-search.git
git push -u origin main
```

---

## 环境变量（可选）

| 变量 | 说明 | 默认 |
|------|------|------|
| `PORT` | 监听端口 | 8787（云端由平台注入） |
| `HOST` | 监听地址 | `0.0.0.0` |

---

## 部署后自检

- `https://你的域名/api/health` → `{"status":"ok","cloud":true}`
- `https://你的域名/api/diag` → 各数据源状态
- 打开首页搜索 `ubuntu`

---

## 本地 vs 云端

| | 本地 | 云端 |
|--|------|------|
| 启动 | `run.bat` / `node server/index.mjs` | 平台自动运行 |
| 访问 | http://127.0.0.1:8787 | https://你的域名 |
| 数据源 | 走你本机网络 | 走服务器网络（国外机房通常更稳） |