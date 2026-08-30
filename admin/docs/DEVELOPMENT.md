# 开发与联调说明

## 数据契约

HTTP 契约以 `E:\work\gpt_work\前端开发说明.md` 与后端实际响应为准。所有请求统一经过 `src/shared/api/client.ts`，页面不得直接调用 `fetch`。

## 后端联调检查

1. 登录、刷新、退出、`/users/me` 和强制改密可用。
2. Dashboard、用户筛选和审计查询字段通过 Zod 契约校验。
3. 后端 CORS 精确放行管理员站点 Origin。
4. 后端本地 CORS 白名单仅允许 `http://localhost:5173`，联调页面须使用该地址访问。
5. 临时密码响应为 HTTP 201 且包含 `Cache-Control: no-store`。
6. `/api/v1/admin/**` 对 USER 返回 403，并且只返回/操作 USER。

## 代码边界

- `app`：Provider、路由、布局与主题。
- `features`：按 auth/dashboard/users/audit 分离页面和业务行为。
- `shared`：API、契约、通用 UI 和纯函数。
