# 扯旋（CheXuan）项目说明

四川扯旋游戏完整工程，由 **Java 后端**、**Cocos 客户端**、**Vue 管理后台** 三部分组成。

## 仓库地址

| 模块 | 技术栈 | 本地路径 | Git 仓库 |
|------|--------|----------|----------|
| 后端 | Spring Boot 3.2 / Java 17 | `chexuan-springboot/` | [github.com/yinyuan1990/chexuan-springboot](https://github.com/yinyuan1990/chexuan-springboot) |
| 客户端 | Cocos Creator / TypeScript | `clubgames/` | [gitee.com/wolfgame_waibao/clubgames](https://gitee.com/wolfgame_waibao/clubgames) |
| 管理后台 | Vue 3 + Vite + Element Plus | `admin/`（本仓库） | [github.com/yinyuan1990/cxadmin](https://github.com/yinyuan1990/cxadmin) |

> 客户端当前托管在 Gitee；后端与管理后台在 GitHub。

## 架构关系

```
┌─────────────┐     HTTP/WS      ┌──────────────────────┐
│  clubgames  │ ◄──────────────► │  chexuan-springboot  │
│  (Cocos)    │                  │  (Spring Boot)       │
└─────────────┘                  └──────────┬───────────┘
                                            │ REST /admin
                                            ▼
                                 ┌──────────────────────┐
                                 │  cxadmin (Vue)       │
                                 │  系统配置 / 机器人等   │
                                 └──────────────────────┘
```

- **clubgames**：玩家端，WebSocket 实时对局，热更新资源在 `热更新/`。
- **chexuan-springboot**：业务 API、WebSocket 游戏逻辑、MySQL + Redis、Flyway 迁移。
- **cxadmin**：运营/开发管理后台，通过 Vite 代理访问后端 `/admin`、`/api`。

## 管理后台（本仓库）

### 功能概览

- 用户与俱乐部管理、授信与反点
- 系统配置（底注、芒果、逃跑惩罚、丁皇吃席金额等）
- **指定发牌（测试）**：三花 / 丁二皇 / 地九王，规则存 Redis
- 机器人批量建桌、礼物配置、客服、战绩查询

### 本地开发

```bash
cd admin
npm install
npm run dev
```

默认：`http://localhost:3010`，API 代理到 `http://127.0.0.1:9000`（见 `vite.config.js`）。

### 构建部署

```bash
npm run build
```

产物在 `dist/`，由 Nginx 以子路径或独立域名挂载；生产环境需将 `/api`、`/admin` 反向代理到 Spring Boot。

## 后端快速命令

在 `chexuan-springboot` 根目录：

```bash
mvn compile
mvn clean package -DskipTests
mvn spring-boot:run
```

Docker 部署脚本见后端仓库 `deploy/docker/`。

## 文档

设计与对接文档在后端仓库：

`chexuan-springboot/src/最新核心文档/`

含 WebSocket 协议、丁皇吃席、三花、周期结算、俱乐部权限等说明。

## 主要分支（参考）

| 仓库 | 常用分支 |
|------|----------|
| chexuan-springboot | `main` |
| clubgames | `gz-cocos-fz`、`qd-bw-2026-6-3`、`master` |
| cxadmin | `main` |
