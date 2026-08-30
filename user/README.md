# AI干饭搭子微信小程序前端

当前版本为一期后端联调版。小程序通过 Taro 请求层调用 Spring Boot REST API，不再保存本地业务 Mock 数据。

## 前端边界

本项目只承载普通用户的小程序功能。管理员账号与管理功能由独立网页管理端承载，不注册到小程序路由，也不在小程序请求层暴露管理员专用 API。后端管理员接口保留不变，供网页管理端复用。

## 本地命令

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build:weapp
```

持续开发构建：

```powershell
npm.cmd run dev:weapp
```

## 导入微信开发者工具

1. 打开微信开发者工具，选择“小程序”。
2. 点击“导入项目”。
3. 项目目录选择本文件所在的 `frontend` 目录，不要单独选择 `dist`。
4. AppID 应自动读取为 `wx1886824289fa9ec6`。
5. 点击“导入”后等待依赖和编译完成，再点击顶部“编译”。

`project.config.json` 已把小程序源码目录指向 `dist`，每次修改前端源码后需要重新执行构建或保持 `dev:weapp` 运行。

## 本地联调

1. 在后端目录执行 `powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1`；脚本会启动项目内的便携 MySQL 和 Java 后端，默认地址为 `http://127.0.0.1:8080/api/v1`。
2. 复制 `.env.example` 的变量到本地终端或构建环境；真机调试使用可访问的 HTTPS 地址。
3. 执行 `npm.cmd run dev:weapp`，在微信开发者工具导入本目录并编译。
4. 注册账号后，后端会初始化默认食物；完成引导后可管理食物、记录饮食、抽取老虎机结果并确认。

本机 Storage 仅保存 Access Token、Refresh Token 和老虎机声音设置；食物、偏好、Spin 和饮食记录均由后端管理。
