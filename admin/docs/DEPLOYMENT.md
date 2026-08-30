# 独立静态站点部署

执行 `npm.cmd run build` 后部署 `dist` 目录。生产环境要求：

1. 使用 HTTPS 和独立管理员域名。
2. 未命中静态文件的路径回退到 `/index.html`，支持 BrowserRouter 刷新。
3. `index.html` 使用 `Cache-Control: no-cache`；带哈希的 `assets/*` 可长期缓存。
4. 后端精确允许管理员 Origin，不使用 `Access-Control-Allow-Origin: *`。
5. 构建环境配置 `VITE_API_BASE_URL=https://<api-domain>/api/v1`。
6. 不向静态环境变量写入密码、Token、数据库信息或其他密钥。

Nginx 路由示例：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```
