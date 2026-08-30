# AI 干饭搭子管理员网页

独立的管理员 Web SPA，用于运营概况、普通用户账号管理、一次性临时密码和操作审计。该项目不属于微信小程序，不提供普通用户业务详情或管理员角色管理。

## 本地运行

要求 Node.js `>=22.12`，当前开发环境使用 Node.js 24 和 npm。

```powershell
npm.cmd install
npm.cmd run dev:api
```

访问 `http://localhost:5173/login`。应用仅连接真实后端，API 地址由 `.env.development` 中的 `VITE_API_BASE_URL` 控制。

## 质量门禁

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

生产构建使用 `VITE_API_BASE_URL` 指定的真实 API。

## 安全规则

- Access Token 仅保存在内存，Refresh Token 仅保存在当前标签页 `sessionStorage`。
- 临时密码只存在于一次性弹窗局部状态，关闭、刷新或换页后销毁。
- 不在日志、埋点或持久化缓存中写入密码或 Token。
- `USER`、未知角色和 `SUPER_ADMIN` 均不能进入本管理端。

更多说明见 [开发与联调说明](docs/DEVELOPMENT.md) 和 [部署说明](docs/DEPLOYMENT.md)。
