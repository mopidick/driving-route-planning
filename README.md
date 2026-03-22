# n 小时可达景点推荐（MVP）

基于当前位置，按 `n 小时` 可达性推荐景点，支持 `公共交通 + 自驾` 两种方式。  
用户采纳推荐后会生成一条待办，保存完整路径摘要、导航步骤和出行 tips，可在待办详情重复查看。

## 功能概览

- 当前位置定位（基于设备授权定位）
- 高德 POI 检索与路径规划（REST API）
- 按实时路由耗时筛选景点并默认按“综合热度优先”排序
- 首页/推荐/待办详情嵌入可交互地图（高德 JS SDK）
- 采纳后生成完整快照待办并本地持久化（`localStorage`）
- 待办详情支持“刷新路线”与“打开高德导航”

## 技术栈

- Vue 3 + Vite + TypeScript
- Vue Router
- Vitest（纯逻辑单测）

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

3. 在 `.env` 中填入高德 Key

```env
VITE_AMAP_WEB_KEY=你的Web端(JS API) Key
VITE_AMAP_SERVICE_KEY=你的Web服务 Key
# 兼容旧配置（不推荐）：VITE_AMAP_KEY=同一个key
VITE_AMAP_PROXY_BASE=/amap
VITE_AMAP_SECURITY_CODE=可选_高德安全密钥
```

4. 启动开发环境

```bash
npm run dev
```

5. 运行测试与构建

```bash
npm test
npm run build
```

## 高德 API 说明

当前使用接口：

- `/v3/geocode/regeo`（逆地理编码）
- `/v3/place/around`（周边景点检索）
- `/v3/direction/driving`（自驾路线）
- `/v3/direction/transit/integrated`（公交路线）
- `https://webapi.amap.com/maps`（JS SDK 地图渲染）

开发环境通过 Vite 代理 `/amap -> https://restapi.amap.com` 规避浏览器跨域限制。

## 地图空白排查

如果地图只有标记点没有底图，通常是以下原因：

- 把 `Web服务` Key 用在了 JS 地图 SDK（应使用 `Web端(JS API)` Key）
- Key 没有把当前访问域名加入白名单（开发期至少加 `localhost` / `127.0.0.1`）
- 安全密钥开启后未配置 `VITE_AMAP_SECURITY_CODE`
