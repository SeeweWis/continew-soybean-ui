# 前后端对齐差异文档

## 2026-10-10 已确认问题修复

本节记录当前修复。下文是历史分析和阶段记录，其中旧 Token 字段、刷新接口及已完成状态不能作为当前契约依据。本次范围为最新分析确认的四项问题，未重新审计所有历史条目。

| 优先级 | 问题 | 当前实现与契约 |
| --- | --- | --- |
| P0 | 登录与会话恢复 | 读取 `accessToken`，只在内存持有；`POST /auth/refresh` 携带 HttpOnly Cookie；HTTP 401 与业务码 401 共用并发刷新，每个请求最多重试一次；会话版本阻止退出或切换账号后的旧请求写回。 |
| P1 | 个人中心 | `PATCH /user/profile/basic/info` 使用 `nickname/gender`，性别为 0 未知、1 男、2 女；密码使用 `PATCH /user/profile/password` 并 RSA 加密；头像使用 `PATCH /user/profile/avatar`，字段 `avatarFile`，保存响应 `avatar` URL。 |
| P1 | 联系方式与验证码 | 手机、邮箱分别通过 `PATCH /user/profile/phone`、`PATCH /user/profile/email` 提交新联系方式、验证码和 RSA 加密的当前密码。发送验证码前调用 `/captcha/behavior` 获取、校验拼图，再将 `captchaVerification` 提交给 `/captcha/sms` 或 `/captcha/mail`；登录页复用此流程。 |
| P1 | 租户管理员密码 | 用户填写并确认新密码，提交 `PUT /tenant/management/{id}/admin/pwd`，请求字段为 RSA 加密的 `password`；操作权限为 `tenant:management:updateAdminUserPwd`。 |
| P2 | 邮箱登录路由 | 在 `build/plugins/router.ts` 中登记 `email-login`，构建生成的路由、转换和类型声明保留该入口。 |

开发 Cookie 来源白名单增加 `http://localhost:9527`。后端需加载更新后的 dev 配置；生产环境仍须配置真实前端 Origin，不使用通配符放行刷新 Cookie。

回归检查 `tests/auth-session.browser.mjs` 对运行中的 `pnpm dev` 使用模拟 API，不发送真实短信、邮件，也不修改真实账号。测试需要已有 Playwright 和 Chromium；可通过 `PLAYWRIGHT_MODULE` 指定已安装 Playwright 模块路径，`BROWSER_EXECUTABLE` 指定本机浏览器，然后执行 `node tests/auth-session.browser.mjs`。`TEST_BASE_URL` 可覆盖默认 `http://localhost:9527`。

静态检查与模拟浏览器验证不能替代真实账号、短信/邮件服务和生产 Cookie 部署联调。

## 1. 文档信息

| 项目          | 当前值                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| 前端目录      | `continew-admin-soybean`                                                                     |
| 前端包名/版本 | `ruoyi-vue-plus` / `2.2.0`                                                                   |
| 后端目录      | `continew-admin`                                                                             |
| 后端版本      | `ContiNew Admin` / `4.2.0-SNAPSHOT`                                                          |
| 前端技术栈    | Vue 3、TypeScript、Vite 8、Pinia、Vue Router、Naive UI、UnoCSS                               |
| 后端技术栈    | Spring Boot 多模块、Sa-Token、MyBatis-Plus、ContiNew CRUD 扩展                               |
| 分析日期      | 2026-09-15                                                                                   |
| 分析方式      | 两个子项目分别使用 jCodeMunch 建索引，并读取控制器、请求模型、响应模型、前端 API、类型和配置 |

结论：前端目前仍以 RuoYi-Vue-Plus 旧接口契约为主，后端已经采用 ContiNew Admin 新接口契约。两者存在系统性的路径、字段、枚举、响应包装和认证流程差异，不能只通过修改少量 URL 完成对齐。

## 2. 优先级定义

| 优先级 | 含义                                       |
| ------ | ------------------------------------------ |
| P0     | 阻断登录、启动、路由或所有请求；必须先处理 |
| P1     | 核心业务页面不可用或存在明显数据/安全风险  |
| P2     | 单个业务模块、功能缺失或字段展示异常       |
| P3     | 文案、类型精度、体验和后续质量改进         |

## 3. P0/P1 差异总览

| 编号  | 领域       | 差异                                                                                                                                      | 影响                                                  | 优先级 |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| D-001 | 登录请求   | 前端发送旧的 `grantType`、`tenantId`、`code/uuid` 结构，后端要求 `clientId + authType`，并按 `ACCOUNT/EMAIL/PHONE/SOCIAL` 多态解析        | 登录请求可能直接校验失败                              | P0     |
| D-002 | 登录响应   | 前端读取 `access_token`、`refresh_token`，后端返回 `token`、`tenantId`                                                                    | 登录后 Token 可能被保存为 `undefined`                 | P0     |
| D-003 | 用户信息   | 前端调用 `/system/user/getInfo`，后端实际为 `/auth/user/info`；字段也从 `userId/userName/nickName/sex` 变为 `id/username/nickname/gender` | 初始化用户、权限和菜单失败                            | P0     |
| D-004 | 动态路由   | 前端调用 `/system/menu/getRouters`，后端实际为 `/auth/user/route`                                                                         | 动态路由模式无法进入业务页面                          | P0     |
| D-005 | 响应码     | 后端默认成功码为数字 `0`，前端通过 `VITE_SERVICE_SUCCESS_CODE` 比较字符串                                                                 | 环境值不一致时所有请求都可能被判定失败                | P0     |
| D-006 | Token 刷新 | 前端 refresh token 实现已注释，失效后直接清理登录状态；后端代码中也未发现独立 refresh endpoint                                            | 必须明确采用“失效即重新登录”还是补充刷新协议          | P0     |
| D-007 | 通用 CRUD  | 后端大量使用 `@CrudRequestMapping` 生成 ContiNew REST API，前端仍调用 `/list`、`/changeStatus`、`optionselect` 等 RuoYi 路径              | 列表、删除、状态修改、字典和树选择大量 404/参数不兼容 | P0     |
| D-008 | 权限码     | 后端通用 CRUD 权限按 `system:user:list/create/update/delete` 等新规则生成；前端页面仍混用旧按钮接口和旧菜单权限                           | 菜单可见但按钮请求 403，或按钮权限判断失效            | P1     |
| D-009 | 租户       | 前端使用 `/system/tenant` 和 `/system/tenant/package`，后端使用 `/tenant/management` 和 `/tenant/package`                                 | 租户管理页面不可用                                    | P1     |
| D-010 | 文件       | 前端使用 `/resource/oss/*`，后端使用 `/system/file`、`/system/storage`、`/system/multipart-upload`                                        | 上传、文件列表、下载和 OSS 配置全部不一致             | P1     |
| D-011 | 生成器     | 前端使用 `/tool/gen/*`，后端使用 `/code/generator/*`                                                                                      | 代码生成页面不可用                                    | P1     |
| D-012 | 安全配置   | 前端将 `VITE_APP_RSA_PRIVATE_KEY` 和固定 AES 密钥作为浏览器可读配置                                                                       | 私钥进入前端构建产物，不能作为秘密保护                | P1     |

## 4. 认证与全局请求协议

### 4.1 登录接口

后端事实：`AuthController` 暴露 `POST /auth/login`，请求体基类要求：

- `clientId`：必填
- `authType`：必填，值为 `ACCOUNT`、`EMAIL`、`PHONE` 或 `SOCIAL`
- `ACCOUNT`：`username`、`password`，可带 `captcha`、`uuid`
- `EMAIL`：`email`、`captcha`
- `PHONE`：`phone`、`captcha`
- `SOCIAL`：`source`、`code`、`state`

前端现状：`src/service/api/auth.ts` 的 `fetchLogin` 类型为 `PwdLoginForm`，类型定义位于 `src/typings/api/auth.d.ts`，字段主要是：

- `clientId?`
- `grantType?`
- `tenantId?`
- `code?`
- `uuid?`
- `username?`
- `password?`

差异与改造要求：

| 项目     | 前端当前实现                                  | 后端契约                                                                     | 改造要求                                                |
| -------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| 认证类型 | 没有统一必填 `authType`                       | 多态必填 `authType`                                                          | 重建登录表单类型和请求构造逻辑                          |
| 账号登录 | `username/password`                           | `authType=ACCOUNT` + `username/password`                                     | 增加 `authType`                                         |
| 租户     | 请求体默认 `tenantId='000000'`                | 后端默认租户 ID 为 `0`，租户头为 `X-Tenant-Id` / `X-Tenant-Code`             | 不要把旧租户字段直接发送给新接口，按后端租户策略处理    |
| 验证码   | `/auth/code` 返回旧 `captchaEnabled/uuid/img` | 图片验证码为 `GET /captcha/image`，另有行为、邮箱、短信验证码                | 重新实现验证码 API 和返回类型                           |
| 社交登录 | `/auth/social/callback`                       | 授权地址 `GET /auth/{source}`，登录仍提交 `/auth/login` 且 `authType=SOCIAL` | 按授权码 `code/state` 流程改造                          |
| 注册     | `/auth/register`                              | 未发现对应后端 Controller 接口                                               | 前端隐藏/删除注册入口，或先补后端接口；不能继续假设存在 |

证据：

- 前端：[src/service/api/auth.ts](../src/service/api/auth.ts)、[src/typings/api/auth.d.ts](../src/typings/api/auth.d.ts)
- 后端：`continew-system/src/main/java/top/continew/admin/auth/controller/AuthController.java`
- 后端请求模型：`continew-system/src/main/java/top/continew/admin/auth/model/req/LoginReq.java` 及其四个子类

### 4.2 登录响应与本地存储

后端 `LoginResp`：

```json
{
  "token": "...",
  "tenantId": 0
}
```

前端当前按 OAuth 风格读取：

```ts
access_token;
refresh_token;
expire_in;
refresh_expire_in;
```

改造要求：

1. 将 `Api.Auth.LoginToken` 改为后端实际响应类型。
2. `loginByToken` 保存 `data.token`，不要读取不存在的 `access_token`。
3. 明确 `tenantId` 是保存到租户 Store、请求头，还是仅用于当前会话初始化。
4. 如果后端没有 refresh endpoint，删除前端 refresh token 假设，失效后统一回登录页。

后端证据：`continew-system/src/main/java/top/continew/admin/auth/model/resp/LoginResp.java`。

### 4.3 用户信息与路由

| 功能         | 前端当前请求                  | 后端请求               | 响应差异                                                                                                                                                                           |
| ------------ | ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 当前用户信息 | `GET /system/user/getInfo`    | `GET /auth/user/info`  | 前端 `user/roles/permissions` 嵌套旧模型；后端返回 `UserInfoResp`，字段为 `id/username/nickname/gender/email/phone/avatar/description/deptId/deptName/permissions/roles/roleNames` |
| 当前用户路由 | `GET /system/menu/getRouters` | `GET /auth/user/route` | 后端返回 `RouteResp[]`，包含 `id/parentId/title/type/path/name/component/redirect/icon/isExternal/isCache/isHidden/permission/sort/children`                                       |

改造要求：

- `useAuthStore` 的 `userInfo` 改为后端 `UserInfoResp` 映射，不再强行套 `Api.System.User`。
- `initDynamicAuthRoute` 改调用 `/auth/user/route`。
- 动态路由转换函数必须确认后端 `type=1/2/3` 与前端路由树类型的映射。
- `roles` 是后端角色编码集合，`permissions` 是权限码集合；前端按钮隐藏只能作为 UX，不能替代后端鉴权。

证据：

- 前端：[src/store/modules/auth/index.ts](../src/store/modules/auth/index.ts)、[src/store/modules/route/index.ts](../src/store/modules/route/index.ts)
- 后端：`AuthController.java`、`UserInfoResp.java`、`RouteResp.java`、`AuthServiceImpl.java`

### 4.4 统一响应格式与成功码

后端配置：

- 全局响应类：`top.continew.starter.web.model.R`
- 成功码：`0`
- 失败码：`1`
- 默认成功消息：`操作成功`
- 错误 HTTP 状态码默认仍可为 `200`

前端请求层：[src/service/request/index.ts](../src/service/request/index.ts) 使用 `VITE_SERVICE_SUCCESS_CODE` 比较 `response.data.code`，并对分页响应特殊检查 `rows` 和 `total`。

差异：

1. 前端类型将 `code` 定义为 `string`，后端配置是数字 `0/1`，运行时虽然可能被转换为字符串，但必须统一类型和环境值。
2. 后端 Controller 返回 `PageResp<T>` 后还会被全局 `R<T>` 包装，前端不能继续假设 RuoYi 的顶层 `rows/total` 结构。
3. 下载接口会返回二进制或文件流，不能套用普通 JSON 成功判定。

改造要求：先从后端 `/v3/api-docs` 或真实响应锁定以下结构，再修改 `transform` 和分页类型：

- 普通成功响应的 `code/msg/data` 类型
- 分页响应中 `data` 的字段名：列表字段、总数、当前页、页大小
- 空响应和 `void` 响应的结构
- 错误响应的 code、msg、HTTP 状态码

### 4.5 Token、客户端和租户请求头

前端当前在请求层发送：

- `Authorization: Bearer <token>`
- `Clientid: VITE_APP_CLIENT_ID`
- `Content-Language`

后端明确配置：

- Token 名称：`Authorization`
- 租户 ID 请求头：`X-Tenant-Id`
- 租户编码请求头：`X-Tenant-Code`
- 登录请求体必须包含 `clientId`

改造要求：

- 核对后端是否读取 `Clientid` 请求头；后端源码目前明确使用登录请求体 `clientId` 和 Token 上下文，不能仅凭前端现有 header 名称认为已经对齐。
- 增加租户请求头注入和租户切换后的请求重试策略。
- 明确大小写和代理层是否会规范化 header 名称。

## 5. 通用 CRUD 路径差异

后端多个控制器通过 `@CrudRequestMapping` 声明 API 集合，核心事实如下：

| 后端资源 | 基础路径             | 启用的通用能力                                              |
| -------- | -------------------- | ----------------------------------------------------------- |
| 客户端   | `/system/client`     | PAGE、GET、CREATE、UPDATE、BATCH_DELETE                     |
| 部门     | `/system/dept`       | TREE、GET、CREATE、UPDATE、BATCH_DELETE、EXPORT、TREE_DICT  |
| 字典     | `/system/dict`       | LIST、GET、CREATE、UPDATE、BATCH_DELETE                     |
| 字典项   | `/system/dict/item`  | PAGE、GET、CREATE、UPDATE、BATCH_DELETE                     |
| 菜单     | `/system/menu`       | TREE、GET、CREATE、UPDATE、BATCH_DELETE、TREE_DICT          |
| 公告     | `/system/notice`     | PAGE、GET、CREATE、UPDATE、BATCH_DELETE                     |
| 角色     | `/system/role`       | LIST、GET、CREATE、UPDATE、BATCH_DELETE、DICT               |
| 用户     | `/system/user`       | PAGE、LIST、GET、CREATE、UPDATE、BATCH_DELETE、EXPORT、DICT |
| 文件     | `/system/file`       | PAGE、UPDATE、BATCH_DELETE                                  |
| 存储     | `/system/storage`    | LIST、GET、CREATE、UPDATE、BATCH_DELETE                     |
| 短信配置 | `/system/sms/config` | PAGE、GET、CREATE、UPDATE、BATCH_DELETE                     |
| 短信日志 | `/system/sms/log`    | PAGE、GET、BATCH_DELETE、EXPORT                             |
| 租户     | `/tenant/management` | PAGE、GET、CREATE、UPDATE、DELETE                           |
| 租户套餐 | `/tenant/package`    | LIST、PAGE、GET、CREATE、UPDATE、DELETE、DICT               |

`PAGE/LIST/TREE` 的最终 URL、批量删除是路径参数还是 JSON 请求体，属于外部 ContiNew CRUD starter 生成规则。代码中可以确认基础路径和能力集合，但不能只凭 Controller 源码把生成路径写死。改造前必须以 `/v3/api-docs` 或浏览器 Network 实际请求冻结这一部分契约。

## 6. 业务 API 差异明细

### 6.1 客户端管理

前端文件：[src/service/api/system/client.ts](../src/service/api/system/client.ts)

| 前端当前调用                      | 后端事实                                                         | 差异                                             |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| `GET /system/client/list`         | 基础路径 `/system/client`，启用 PAGE/LIST 等由 CRUD starter 生成 | 列表 URL 和分页语义需调整                        |
| `POST /system/client`             | `POST /system/client`                                            | 路径可能一致，但请求字段需按 `ClientReq` 对齐    |
| `PUT /system/client`              | `PUT /system/client`                                             | 路径可能一致，但响应和字段需对齐                 |
| `DELETE /system/client/{ids}`     | BATCH_DELETE 已启用                                              | 删除参数形态需按 OpenAPI 确认                    |
| `PUT /system/client/changeStatus` | 未发现该自定义方法                                               | 应改用后端客户端更新契约，不能继续调用旧状态接口 |

后端 `ClientResp` 的核心字段为 `id/clientId/clientType/authType/activeTimeout/timeout/isConcurrent/replacedRange/maxLoginCount/overflowLogoutMode/status`，与前端旧的客户端类型定义必须逐字段对照。

### 6.2 部门

前端当前使用：

- `/system/dept/list`
- `/system/dept/list/exclude/{id}`
- `/system/dept/optionselect`

后端 `DeptController` 基础路径为 `/system/dept`，并提供树、树字典和导出能力；未在 Controller 中发现前端 `exclude`、`optionselect` 这两个旧方法。

字段差异：

| 前端字段                                            | 后端字段                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `deptId`                                            | `id`                                                               |
| `deptName`                                          | `name`                                                             |
| `orderNum`                                          | `sort`                                                             |
| `tenantId`、`ancestors`、`leader`、`phone`、`email` | 后端响应主要为 `id/name/parentId/status/sort/isSystem/description` |

改造：统一树节点为后端 `id/parentId/name`，再在前端组件适配 `key/label`，不要让 API 类型继续伪装为旧 RuoYi 部门模型。

### 6.3 字典和字典项

前端当前拆为：

- `/system/dict/type/*`
- `/system/dict/data/*`
- `/system/dict/data/type/{dictType}`

后端拆为：

- `/system/dict`
- `/system/dict/item`
- `/system/common/dict/{code}`：公共字典查询
- `/system/dict/cache/{code}`：清理单个字典缓存

字段差异：

| 前端                                                                         | 后端                                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 字典类型：`dictId/dictName/dictType/remark`                                  | `id/name/code/description/isSystem`                            |
| 字典项：`dictCode/dictLabel/dictValue/dictSort/dictType/listClass/isDefault` | `id/label/value/color/status/sort/description/dictId`          |
| 状态                                                                         | 前端旧值 `0/1`；后端 `DisEnableStatusEnum` 为 `1=启用、2=禁用` |

`useDict` 当前调用 `fetchGetDictDataByType(dictType)`，必须改为后端公共字典查询协议，并将 `label/value` 映射到现有选择器；管理页面则分别对齐 `/system/dict` 和 `/system/dict/item`。

### 6.4 菜单、角色和权限

前端菜单 API：[src/service/api/system/menu.ts](../src/service/api/system/menu.ts)

前端当前仍调用：

- `/system/menu/list`
- `/system/menu/treeselect`
- `/system/menu/roleMenuTreeselect/{roleId}`
- `/system/menu/tenantPackageMenuTreeselect/{packageId}`
- `/system/menu/cascade/{ids}`

后端提供：

- `/system/menu` 的 TREE/GET/CREATE/UPDATE/BATCH_DELETE/TREE_DICT
- `DELETE /system/menu/cache`
- 角色权限树和租户套餐菜单树应分别从 `RoleController`、`PackageController` 的新接口获取，不能假设仍挂在旧 MenuController 路径下

字段差异：

| 前端菜单字段      | 后端菜单字段                                |
| ----------------- | ------------------------------------------- |
| `menuId`          | `id`                                        |
| `menuName`        | `title`                                     |
| `orderNum`        | `sort`                                      |
| `menuType: M/C/F` | `type: 1/2/3`，分别为目录/菜单/按钮         |
| `perms`           | `permission`                                |
| `isFrame`         | `isExternal`                                |
| `visible`         | `isHidden` 的语义相反方向，需转换           |
| `isCache`         | `isCache`，类型由旧状态字符串变为后端布尔值 |

角色差异：

- 前端：`roleId/roleName/roleKey/roleSort`
- 后端：`id/name/code/sort`
- 后端新增明确的 `GET /system/role/permission/tree`、`PUT /system/role/{id}/permission`、`GET /system/role/{id}/user`、`POST /system/role/{id}/user`、`DELETE /system/role/user`、`GET /system/role/{id}/user/id`
- 前端旧的 `changeStatus`、`dataScope`、`optionselect`、`authUser/allocatedList`、`selectAll/cancelAll` 路径不能直接保留

后端权限码由 `BaseController` 根据资源基础路径和 CRUD 能力生成，例如 `POST /system/user` 对应 `system:user:create`。前端应以数据库菜单 SQL/后端权限码为准，统一 `hasAuth()` 和按钮显示条件。

### 6.5 用户管理与个人资料

前端用户 API：[src/service/api/system/user.ts](../src/service/api/system/user.ts)

后端 `UserController`：

- 基础路径 `/system/user`
- 通用 PAGE/LIST/GET/CREATE/UPDATE/BATCH_DELETE/EXPORT/DICT
- `GET /system/user/import/template`
- `POST /system/user/import/parse`
- `POST /system/user/import`
- `PATCH /system/user/{id}/password`
- `PATCH /system/user/{id}/role`

前端旧接口与后端差异：

| 前端当前接口                     | 后端对应情况                                                             |
| -------------------------------- | ------------------------------------------------------------------------ |
| `/system/user/list`              | 后端同时有 PAGE/LIST，需确认分页接口究竟对应基础路径还是 `/list`         |
| `/system/user/list/dept/{id}`    | 未在 UserController 中发现同名方法，需改用后端用户查询参数或新增后端接口 |
| `/system/user/optionselect`      | 未发现同名方法，使用 DICT 能力或后端实际字典接口                         |
| `/system/user/changeStatus`      | 未发现同名自定义方法，状态应纳入更新契约                                 |
| `/system/user/resetPwd`          | 后端为 `PATCH /system/user/{id}/password`，并使用 `UserPasswordResetReq` |
| `/system/user/authRole`          | 后端为 `PATCH /system/user/{id}/role`                                    |
| `/system/user/profile`           | 后端个人资料统一在 `/user/profile`                                       |
| `/system/user/profile/updatePwd` | 后端为 `PATCH /user/profile/password`                                    |
| `/system/user/profile/avatar`    | 后端为 `PATCH /user/profile/avatar`                                      |

用户字段必须整体迁移：

| 前端旧字段              | 后端字段                    | 备注                                   |
| ----------------------- | --------------------------- | -------------------------------------- |
| `userId`                | `id`                        | 后端为 Long，前端应兼容字符串化大整数  |
| `userName`              | `username`                  | 命名变化                               |
| `nickName`              | `nickname`                  | 命名变化                               |
| `sex`                   | `gender`                    | 后端枚举 `0=未知、1=男、2=女`          |
| `phonenumber`           | `phone`                     | 命名变化，后端响应可能脱敏             |
| `remark`                | `description`               | 命名变化                               |
| `roleIds` / `roleNames` | `roleIds` / `roleNames`     | 后端用户响应保留，但角色对象字段已变化 |
| `status: '0'/'1'`       | `1=启用、2=禁用`            | 枚举值必须转换                         |
| `postIds`               | 后端 `UserReq` 未发现该字段 | 岗位能力不能继续假设存在               |

后端请求校验比前端旧模型严格：用户名、昵称、密码、手机号、邮箱、部门、角色均有后端校验。前端表单应按后端 `UserReq` 重写，不能只改接口 URL。

### 6.6 系统配置

前端 `src/service/api/system/config.ts` 使用 `/system/config/*`，后端没有对应 `ConfigController`，实际为 `OptionController`：

- `GET /system/option`
- `PUT /system/option`
- `PATCH /system/option/value`

后端更新请求是 `List<OptionReq>`，重置请求是 `OptionValueResetReq`。前端当前的新增、删除、按 key 更新、刷新缓存接口都不能直接保留。

### 6.7 文件、存储和上传

前端当前使用 `/resource/oss/*`，后端资源划分如下：

| 能力               | 后端接口                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| 文件分页/更新/删除 | `/system/file`                                                               |
| 普通上传           | `POST /system/file/upload`，参数含 `file`、可选 `parentPath`、`uploadTaskId` |
| 默认上传配置       | `GET /system/file/upload/config/default`                                     |
| 上传进度           | `GET /system/file/upload/progress/{uploadTaskId}`                            |
| 创建目录           | `POST /system/file/dir`                                                      |
| 文件夹大小         | `GET /system/file/dir/{id}/size`                                             |
| 文件统计           | `GET /system/file/statistics`                                                |
| 文件存在性         | `GET /system/file/check?fileHash=...`                                        |
| 文件回收站         | `/system/file/recycle`                                                       |
| 存储配置           | `/system/storage`                                                            |
| 分片初始化         | `POST /system/multipart-upload/init`                                         |
| 上传分片           | `POST /system/multipart-upload/part`                                         |
| 完成分片           | `GET /system/multipart-upload/complete/{uploadId}`                           |
| 取消分片           | `GET /system/multipart-upload/cancel/{uploadId}`                             |

核心模型差异：

- 普通上传响应为 `id/url/thUrl/metadata`，不是前端旧 `Oss` 模型。
- 文件列表响应为 `id/name/originalName/size/url/parentPath/path/extension/contentType/type/sha256/.../storageId/storageName`。
- 上传进度状态为 `INIT/UPLOADING/FINALIZING/COMPLETED/FAILED/NOT_FOUND`。
- 分片初始化要求 `fileName/fileSize/fileMd5/contentType?/parentPath?/metaData?`。
- 后端默认单文件直传上限为 10MB，分片上传阈值由存储配置返回，前端不应继续硬编码旧 OSS 行为。

下载也必须迁移：前端 `useDownload().oss()` 使用 `/resource/oss/download/{id}`，后端未发现该路径；应使用后端文件 URL 或后端实际文件下载接口，并确认 `Download-Filename`、Content-Type 和鉴权方式。

### 6.8 租户和套餐

前端当前：

- `/system/tenant/*`
- `/system/tenant/package/*`

后端：

- 租户：`/tenant/management`
- 套餐：`/tenant/package`
- 套餐菜单树：`GET /tenant/package/menu/tree`
- 租户管理员密码：`PUT /tenant/management/{id}/admin/pwd`

前端的 `syncTenantDict`、`syncTenantPackage`、`syncTenantConfig`、动态切换租户等旧接口在后端对应关系未建立，必须逐个以后端 Controller/Service 或实际 OpenAPI 确认，不能批量改前缀后继续使用。

### 6.9 监控、日志和消息

前端当前监控 API：

- `/monitor/cache`
- `/monitor/logininfor/*`
- `/monitor/online/*`
- `/monitor/operlog/*`

后端当前：

- 在线用户：`/monitor/online`，分页为 `GET` 基础路径，强退为 `DELETE /monitor/online/{token}`
- 系统日志：`/system/log`，分页、详情、登录日志导出、操作日志导出
- 未发现前端 `/monitor/cache`、`/monitor/logininfor`、`/monitor/operlog` 对应 Controller

后端还新增个人消息：

- `/user/message/unread`
- `/user/message`
- `/user/message/{id}`
- `/user/message/read`
- `/user/message/readAll`
- `/user/message/notice/unread`
- `/user/message/notice/unread/{method}`
- `/user/message/notice`
- `/user/message/notice/{id}`

前端通知 Store、用户头像/消息入口和首页待办应先确认是否要接入该能力；当前 API 目录中没有对应消息 API 文件。

### 6.10 代码生成和示例页面

前端使用 `/tool/gen/*`，后端生成器基础路径为 `/code/generator`，接口包括：

- `GET /code/generator/config`
- `GET /code/generator/config/{tableName}`
- `GET /code/generator/field/{tableName}`
- `POST /code/generator/config/{tableName}`
- `GET /code/generator/preview/{tableNames}`
- `POST /code/generator/{tableNames}/download`
- `POST /code/generator/{tableNames}`
- `GET /code/generator/dict`

前端当前 `importTable/getDataNames/db/list/synchDb/genCode` 等旧接口没有后端同名实现，应按新生成器页面和模型重做。

前端 `/demo/demo`、`/demo/tree` 未在后端索引中发现对应 Controller；这些页面只能保留为纯前端示例，不能作为联调功能。

前端 `/system/post/*` 未在后端发现岗位 Controller；应隐藏页面，或先补后端岗位模块。

## 7. 字段与枚举统一表

### 7.1 状态和性别

| 领域     | 前端当前值             | 后端值                                                 | 改造动作                            |
| -------- | ---------------------- | ------------------------------------------------------ | ----------------------------------- |
| 启用状态 | `'0'` 正常、`'1'` 停用 | `1` 启用、`2` 禁用                                     | 统一后端值，字典显示层再转中文      |
| 性别     | `sex: '0'/'1'/'2'`     | `gender: 0/1/2`                                        | 字段名改为 `gender`，值保持数字语义 |
| 菜单类型 | `M/C/F`                | `1/2/3`                                                | 增加 API 映射，不要直接复用旧枚举   |
| 数据范围 | 前端旧 `1-6`           | 后端 `1-5`：全部、部门及子部门、本部门、本人、自定义   | 删除前端多出的值 6，并同步角色表单  |
| 认证类型 | `grantType` 字符串     | `ACCOUNT/EMAIL/PHONE/SOCIAL`                           | 以 `authType` 为唯一契约字段        |
| 分片状态 | 前端未建立对应模型     | `INIT/UPLOADING/FINALIZING/COMPLETED/FAILED/NOT_FOUND` | 新增上传状态显示和失败处理          |

### 7.2 通用响应字段

| 前端假设             | 后端事实                                                  | 改造动作                                |
| -------------------- | --------------------------------------------------------- | --------------------------------------- |
| `createBy/updateBy`  | `createUser/createUserString/updateUser/updateUserString` | 统一展示模型，不直接复用旧 CommonRecord |
| `tenantId` 普遍存在  | 租户由后端上下文和请求头隔离，部分公共表忽略租户          | 只在真实租户资源类型中保留              |
| `id` 任意字符串/数字 | 后端实体多为 Long，Jackson 配置为 FLEXIBLE                | 前端 ID 类型必须兼容字符串化大整数      |
| `rows/total`         | 后端为 `R<PageResp<T>>`，内部结构需以 OpenAPI/响应确认    | 重写分页 transform 和类型               |

## 8. 前端配置差异

后端关键配置位于 `continew-server/src/main/resources/config/application.yml`：

- context path：`/`
- API 文档：`/v3/api-docs`
- Swagger UI：`/swagger-ui`
- 成功码：`0`
- Token header：`Authorization`
- 租户 header：`X-Tenant-Id`、`X-Tenant-Code`
- 文件直传大小：10MB
- 默认端口由 Docker 配置暴露为 18000

前端由 `VITE_SERVICE_BASE_URL + VITE_APP_BASE_API` 组成请求地址，开发代理配置在 `vite.config.ts` 和 `build/config` 中。对齐时必须确认：

1. `VITE_SERVICE_BASE_URL` 是否指向后端实际地址。
2. `VITE_APP_BASE_API` 是否为空或重复拼接 `/`。
3. `VITE_SERVICE_SUCCESS_CODE` 是否为 `0`。
4. `VITE_SERVICE_LOGOUT_CODES`、`VITE_SERVICE_MODAL_LOGOUT_CODES`、`VITE_SERVICE_EXPIRED_TOKEN_CODES` 是否包含后端实际业务码。
5. SSE/WebSocket 路径是否真实存在；当前前端使用 `/resource/sse`、`/resource/websocket`，后端源码索引未发现对应资源 Controller，需单独联调确认。

### 安全阻断

前端 [src/utils/jsencrypt.ts](../src/utils/jsencrypt.ts) 读取 `VITE_APP_RSA_PRIVATE_KEY`，登录表单还读取固定 AES key。前端构建变量会进入浏览器环境，私钥不能放在这里。

改造要求：

- 私钥只放后端。
- 前端只使用公开密钥，或直接依赖 HTTPS/TLS。
- 先确认后端请求加密/字段加密协议，再决定是否保留 `handleEncrypt`。
- 不要把现有 `.env` 中的密钥复制到文档、日志或提交记录。

## 9. 推荐改造顺序

### 阶段一：冻结契约，阻断 P0

1. 从后端 `/v3/api-docs` 导出并保存认证、响应、分页和 CRUD API 契约。
2. 对齐 `R<T>` 响应转换、成功码和错误码。
3. 重做登录请求/响应、用户信息和动态路由。
4. 决定 Token 失效策略：重新登录，或补后端 refresh endpoint。
5. 注入 `X-Tenant-Id` / `X-Tenant-Code`，完成租户上下文策略。

### 阶段二：迁移公共模型和 API

1. 新建后端模型对应的前端类型，不在旧 `Api.System.*` 类型上继续打补丁。
2. 迁移通用 CRUD API 和分页参数。
3. 统一 `id/name/title/status/gender/type` 等字段和枚举。
4. 修改 `useDict`、表格分页、权限按钮和导出下载。

### 阶段三：按后端菜单迁移页面

1. system：用户、角色、菜单、部门、字典、字典项、客户端、公告。
2. system：参数、文件、存储、短信配置、短信日志。
3. tenant：租户管理、套餐管理。
4. code：代码生成。
5. monitor：在线用户、系统日志、消息中心。
6. 删除或隐藏后端不存在的 demo、post 和旧 OSS 页面。

### 阶段四：上传、安全和回归

1. 按普通上传和分片上传两条链分别实现。
2. 移除前端私钥和固定密钥依赖。
3. 为认证、动态路由、分页、权限、上传和租户切换补测试。
4. 完成真实后端联调和浏览器 Network 验证。

## 10. 改造验收清单

### 认证

- [ ] 账号登录发送 `clientId + authType=ACCOUNT + username + password`。
- [ ] 登录成功后保存后端 `token`，不再读取 `access_token`。
- [ ] `/auth/user/info` 能初始化用户、角色和权限。
- [ ] `/auth/user/route` 能完成动态路由注册和首页跳转。
- [ ] Token 失效行为与后端策略一致，且不会无限重试。
- [ ] 验证码、社交登录、注册入口均有明确后端对应关系。

### 公共协议

- [ ] 前端成功码与后端 `0` 一致。
- [ ] 普通响应、分页响应、空响应、错误响应和文件响应均通过类型检查。
- [ ] 页面分页参数、列表字段和总数经过真实响应确认。
- [ ] Long ID 在前端不会发生精度丢失。
- [ ] 租户请求头在登录后、切换租户后和刷新页面后均正确。

### 业务页面

- [ ] 用户、角色、菜单、部门、字典、公告和客户端 CRUD 全部可用。
- [ ] 后端不存在的 `/system/config`、`/resource/oss`、`/tool/gen`、`/system/tenant` 页面已迁移或隐藏。
- [ ] 角色权限树、用户授权、菜单树字段和权限码与后端一致。
- [ ] 文件普通上传、分片上传、进度、回收站、下载均可用。
- [ ] 代码生成、短信配置、短信日志、消息中心按后端新路径联调。

### 安全与质量

- [ ] 构建产物中不存在 RSA 私钥和固定 AES 密钥。
- [ ] 不再依赖前端隐藏按钮作为权限控制。
- [ ] 认证、权限、分页、上传和租户切换有最小回归测试。
- [ ] `vue-tsc`、lint、build 和真实浏览器联调均有独立证据。

## 11. 未决契约，改造前必须确认

以下项目仅凭当前两套源码不能安全推断，必须从运行中的后端 OpenAPI 或 Network 响应确认：

1. ContiNew CRUD starter 对 `PAGE/LIST/TREE/DELETE/BATCH_DELETE/DICT/TREE_DICT` 生成的完整 URL 和请求体。
2. `R<PageResp<T>>` 的实际 JSON 字段层级。
3. 后端是否通过请求头读取客户端 ID，以及 header 的规范大小写。
4. 后端请求加密是否启用、算法、header 名和字段加密的完整协议。
5. refresh token 是否由 starter 隐式处理，还是明确不支持。
6. SSE/WebSocket 的实际 endpoint 和鉴权方式。
7. 租户切换、租户可用列表和套餐同步是否由其他未索引依赖或部署模块提供。

## 12. 分析限制

- 本文是当前 checkout 的静态契约差异，不等同于已完成运行时联调。
- 前端 `.env*` 文件按安全策略未读取原文，因此成功码、退出码和 API base URL 的具体环境值仍需在联调环境确认。
- 后端通用 CRUD 实现来自 starter 依赖，源码仓库只包含 Controller 的能力声明；生成式 endpoint 的最终形态必须通过 OpenAPI/实际请求确认。
- 后端工作区原有 `pom.xml` 未提交改动，本次未修改。

## 13. 阶段一完成度（2026-09-15 复核）

复核方式：对照运行中后端（http://localhost:8000，dev profile）实测 + OpenAPI（已冻结至 `docs/api/openapi.json`）+ 前端源码审计。

### 13.1 已完成

| 阶段一任务         | 状态           | 说明                                                                                                                                                                                           |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 冻结 OpenAPI 契约  | ✅             | `docs/api/openapi.json`（135 路径，4.2.0-SNAPSHOT）                                                                                                                                            |
| 登录请求/响应      | ✅（前次会话） | `authType/clientId` 多态类型、`token/tenantId` 响应、密码 RSA 公钥加密                                                                                                                         |
| 用户信息           | ✅（前次会话） | `/auth/user/info` + `UserInfoResp` 字段模型                                                                                                                                                    |
| 动态路由           | ✅（前次会话） | `/auth/user/route` + ContiNew 路由转换（type 1/2/3）                                                                                                                                           |
| Token 失效策略     | ✅（前次会话） | 无 refresh endpoint，失效即弹窗重新登录（code 401）                                                                                                                                            |
| 响应成功码         | ✅             | `Number(code) === 0`；本次将 `VITE_SERVICE_SUCCESS_CODE` 200→0 消除矛盾                                                                                                                        |
| 验证码             | ✅（本次）     | `/auth/code` → `/captcha/image`，实测返回 `uuid/img`                                                                                                                                           |
| clientId           | ✅（本次）     | `.env*` 旧 RuoYi 值 `e5cd…` 改为后端种子值 `ef51c9a3e9046c4f2ea45142c8a8344a`（实测旧值"客户端不存在"）                                                                                        |
| RSA 公钥配对       | ✅（本次）     | `.env.dev` 公钥改为后端 dev 密钥对公钥（modulus 实测配对）；test/prod 需按部署后端替换                                                                                                         |
| 租户上下文         | ✅（本次）     | 登录后保存 `LoginResp.tenantId`，请求层注入 `X-Tenant-Id`，登出清除                                                                                                                            |
| 死代码清理         | ✅（本次）     | 移除 `Clientid` 请求头（后端只读登录体 clientId）、`VITE_APP_RSA_PRIVATE_KEY` env 与类型声明（前端无代码引用）                                                                                 |
| SSE/WebSocket      | ✅（本次）     | `VITE_APP_SSE=Y→N`（后端无 SSE 端点）；WebSocket URL `/resource/websocket`→`/websocket`（后端 `continew-starter.messaging.websocket.path`）                                                    |
| 用户管理页迁移收尾 | ✅（本次）     | `user-operate-drawer`/`user-password-drawer` 迁移至 `ContinewUser/ContinewUserReq` 契约（字段名、gender/status 枚举、角色字典 `GET /system/role/dict`、创建密码 RSA 加密），`vue-tsc` 恢复通过 |

### 13.2 遗留与未决（阶段二/三/四处理）

1. `fetchTenantList`（`/auth/tenant/list`）后端无对应接口；`TenantSelect` 组件当前未挂载，未产生实际请求。租户切换/列表能力待阶段三按 `/tenant/management`、`/tenant/common/id` 重做。
2. `VITE_SERVICE_EXPIRED_TOKEN_CODES=9999,9998,3333` 为 RuoYi 死配置（后端不会返回），无害未清理。
3. `.env.test`/`.env.prod` 的 RSA 公钥仍为 RuoYi 旧值，部署前必须替换为对应后端 `FIELD_ENCRYPT_PUBLIC_KEY`。
4. 字典编码 `sys_user_sex`、`sys_normal_disable` 的值域需与后端字典数据联调确认（前端展示与表单均沿用该编码）。
5. 阶段二及以后：通用 CRUD 路径/分页迁移、`useDict` 公共字典协议、文件上传/存储、代码生成、监控日志、消息中心等按原计划推进。

## 14. 阶段三、四完成度（2026-09-15 复核）

### 14.1 阶段三：按后端菜单迁移页面（已完成）

以后端 `sys_menu` 种子数据为权威页面清单（`main_data.sql` + `plugin_tenant.sql`），19 个菜单路由全部有对应视图，动态路由转换（`transformServerDynamicRoute`）Layout 白名单补充 `tenant`。

| 后端菜单                              | 前端视图                                                              | 状态 |
| ------------------------------------- | --------------------------------------------------------------------- | ---- |
| /system/user                          | system/user/index（列表+搜索+新增/编辑/重置密码/导入抽屉）            | ✅   |
| /system/role                          | system/role/index（列表+CRUD+功能权限树+数据范围+分配用户）           | ✅   |
| /system/menu                          | system/menu/index（树表+CRUD+类型 1/2/3+清除缓存）                    | ✅   |
| /system/dept                          | system/dept/index（树表+CRUD+导出）                                   | ✅   |
| /system/notice                        | system/notice/index + add（发布/编辑）+ view（详情）                  | ✅   |
| /system/file                          | system/file/index（分页+下载+删除+上传弹窗）                          | ✅   |
| /system/dict                          | system/dict/index（字典列表+字典项分页+缓存清理）                     | ✅   |
| /system/dict/item                     | system/dict/item/index（重定向到字典管理页）                          | ✅   |
| /system/config                        | system/config/index（7 个 Tab：网站/安全/登录/邮件/短信/存储/客户端） | ✅   |
| /system/config/site 等 6 个隐藏子路由 | 各自独立子页 + 共享 modules 组件                                      | ✅   |
| /monitor/online                       | monitor/online/index（分页+强退）                                     | ✅   |
| /monitor/log                          | monitor/log/index（分页+详情弹窗）                                    | ✅   |
| /system/sms/log                       | monitor/sms/log/index（分页+删除+导出）                               | ✅   |
| /tenant/management                    | tenant/management/index（分页+CRUD+重置管理员密码）                   | ✅   |
| /tenant/package                       | tenant/package/index（分页+CRUD+菜单树关联）                          | ✅   |

已删除的无后端对应页面：demo、post、旧 oss/oss-config、旧 config（RuoYi /system/config CRUD）、monitor/cache、monitor/logininfor、monitor/operlog、tool/gen（后端生成器契约完全不同且无菜单挂载，待菜单种子补充后单独重建）、TenantSelect 组件（无挂载点）、user-center 在线设备 Tab（后端无对应接口）。

关键契约改造：

- `useDict` 改为 `GET /system/common/dict/{code}`（LabelValueResp），字典 store/DictTag/DictSelect/DictRadio 同步迁移。
- 后端字典种子仅含 notice_type/client_type/sms_supplier，故性别（0/1/2）、启用状态（1/2）、数据范围（1-5）、菜单类型（1/2/3）等改用 `src/constants/business.ts` 本地枚举，不再依赖 RuoYi 字典码。
- 权限码统一为 ContiNew 生成规则（system:user:create/update/delete/get/list/export 等，超管 `*:*:*` 直通）。
- 列表接口为 LIST（不分页）的角色/菜单/部门改用非分页表格；PAGE 接口统一 `{list, total}`。
- 批量删除统一 `DELETE /base` + `{ids}` 请求体；租户/套餐为单删路径。

### 14.2 阶段四：上传、安全和回归（核心项已完成）

| 任务                                                                | 状态                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 普通上传链（POST /system/file/upload，multipart file + parentPath） | ✅ 文件页上传弹窗                                                     |
| 分片上传链（init → part 循环 → complete，失败 cancel 清理）         | ✅ 单文件 >10MB 自动切换，MD5 用已有 crypto-js 计算，零新增依赖       |
| 移除前端私钥和固定密钥依赖                                          | ✅（阶段一时已完成：RSA 私钥 env 与类型声明已删除，前端仅用公钥加密） |
| 认证/动态路由/分页/权限回归                                         | ✅ vue-tsc 全绿 + oxlint/eslint 全绿 + vite build 成功                |
| 真实浏览器联调                                                      | ⚠️ 未执行（需要有效账号+验证码），建议启动 `pnpm dev` 人工走查        |

### 14.3 遗留与建议

1. 消息中心：后端 `/user/message/*` 接口齐全但菜单种子未挂载页面，前端消息 API 已随死代码清理删除，待菜单就绪后按需重建。
2. 代码生成：后端 `/code/generator/*` 契约与 RuoYi 完全不同且菜单未挂载，需要独立页面设计。
3. 角色功能权限树无回显来源（RoleDetailResp.menuIds 可用，已接入）；角色数据范围 deptIds 已通过详情回显。
4. 字典驱动展示（notice_type/client_type/sms_supplier）需联调确认后端字典数据值域。
5. 全量回归通过：`vue-tsc --noEmit` 0 错误、`oxlint src` 0 错误、`eslint src` 0 错误、`vite build --mode prod` 成功。

## 15. 浏览器联调记录（2026-09-15 晚）

在真实前后端联调中发现并修复 3 个运行时缺陷，全部页面走查通过。

### 15.1 修复的缺陷

| #   | 现象                                                  | 根因                                                                                                                                                                       | 修复                                                                                                          |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | 登录页验证码 502                                      | `.env.dev` 的 `VITE_SERVICE_BASE_URL` 仍指 8080，实际后端在 8000                                                                                                           | 改为 `http://localhost:8000` 并重启 dev 服务                                                                  |
| 2   | 侧边栏只剩"租户管理"，系统管理/系统监控菜单全部丢失   | `addAuthRoutes` 对已转换的 ContiNew 路由执行旧 RuoYi `parseRouter`：所有 Layout 的 name 被改写为 `layout.base`（Map 键互相覆盖只剩最后一个），组件名被污染为 `view.view.*` | 删除 `parseRouter` 调用与死函数（ContiNew 路由由 `transformServerDynamicRoute` 生成最终形态）                 |
| 3   | 点击"通知公告"跳到隐藏的"查看公告"页                  | 生成的 elegant 路由转换器给**任何带 children 的视图路由**自动加 `redirect: 第一个子路由`                                                                                   | `transformServerDynamicRoute` 将子菜单**平铺为同级路由**（后端路径均为绝对路径），视图级路由不再携带 children |
| 4   | 系统 Tab 内嵌表格（客户端/存储/短信配置）数据行不可见 | NTabPane 内 `flex-height`+`h-full` 高度链断裂，表格 wrapper 塌陷为 41px，数据行溢出被裁剪                                                                                  | 三个表格组件移除 `flex-height`/`h-full`，改自然高度                                                           |

### 15.2 走查结果（全部通过）

- **登录**：验证码（/captcha/image）→ admin 登录成功，跳转首页。
- **系统管理**：用户（10 行+部门树）、角色（5 行+数据范围标签）、菜单（6 目录树表）、部门（树表）、字典（3 字典类型+notice_type 2 项彩色标签）、文件（上传→列表展示全链路 ✓）、系统配置（7 Tab，网站参数真实数据、客户端列表完整）。
- **系统监控**：在线用户（2 条）、系统日志（64 条+状态标签+分页）、短信日志（空态正确）。
- **租户**：租户管理/套餐管理页面正常，库中无数据（total=0，空态正确）。
- **上传链**：POST /system/file/upload（multipart）返回 `{id,url,metadata}` 与前端类型一致，列表正确展示。

### 15.3 待用户处理：后端认证接口延迟 3~7 秒

联调中发现**所有带认证的接口耗时 3~7 秒**（直连后端 8000 亦然，代理无延迟；无认证接口 4ms）。例如 `/auth/user/info` 3.4s、`/system/user` 7.3s。这导致页面数据加载缓慢（前端逻辑正常，只是响应慢）。建议排查 IDEA 后端进程：是否挂了调试器断点、数据库/Redis 会话存储连接、Sa-Token 会话查询。

## 16. 字典统一与数据治理（2026-09-15 深夜）

### 16.1 sys_menu 数据治理（API 直改数据库，非前端映射）

| 问题                          | 根因                                                                               | 修复                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 菜单图标不显示                | icon 列为 ContiNew 裸名（settings/user/computer…），前端 SvgIcon 需要 iconify 格式 | 通过 PUT /system/menu/{id} 将全部 27 处裸名改为 mdi:\* 格式（数据层修复，前端零映射）                               |
| path/component 与真实文件对照 | 组件值 30+ 个已与 src/views 一一对应，仅 4 个缺失视图                              | 新建 src/views/open/app、schedule/job、schedule/log、code/generator 四个视图 + Layout 白名单补充 open/schedule/code |
| 菜单权限标识列"无数据"        | 权限码只在按钮级菜单（type 3），树表默认折叠只看到 null 的目录/菜单行              | 展开后按钮行显示完整权限码（已验证 system:user:list 等），权限列空值显示 '-' 占位                                   |

种子文件 `main_data.sql` 已同步更新（icon 列 + 新字典），新装环境一致。

### 16.2 数据字典补充与前端统一 useDict

后端新增 5 个业务字典（API 创建 + 种子 SQL）：`gender`（0未知/1男/2女）、`dis_enable_status`（1启用/2禁用）、`data_scope`（1-5）、`menu_type`（1目录/2菜单/3按钮）、`file_type`（0-5）。

前端已删除 `constants/business.ts` 全部硬编码映射（genderRecord、disEnableStatusRecord、dataScopeRecord 等 17 组），约 15 个页面/组件全部改为 DictTag / DictSelect / DictRadio + useDict 消费（涉及 user、role、menu、dept、dict、client、storage、sms、file、tenant 模块）。

修复两个 useDict 逻辑缺陷：

1. 空数组被写入选区缓存导致字典创建后仍显示空 → 空数组不视为缓存命中；
2. DictSelect/DictTag 默认 `immediate=false` 互相等待形成死锁（store 永远为空）→ 无论 immediate 与否都主动拉取一次（store 缓存去重）。

### 16.3 系统配置页左右布局

由水平 Tabs 改为 NLayout has-sider：左侧配置菜单列表（NMenu 7 项），右侧渲染对应表单/表格。

### 16.4 请求慢与偶现 10000ms 超时结论

- **根因**：后端连接的 MySQL/Redis 均为远程主机（117.157.85.156），且认证请求内部处理耗时 3~7s（网络 RTT 仅 15ms、Redis PING 0.1ms，排除网络因素）→ 指向后端内部问题：**IDEA 以 Debug 模式运行（调试挂起）**、p6spy SQL 日志开销、或 SQL N+1。
- **偶现 502**：联调期间后端多次出现持续数十秒的 502 窗口（疑似 IDEA devtools 热重启或远程连接抖动），与用户反馈"偶现超时"同源。
- **前端缓解**：axios 默认超时由 10s 放宽到 30s（packages/axios/src/options.ts），消除偶现 10000ms 中断。
- **建议**：后端改 Run 模式（非 Debug）启动；评估将 MySQL/Redis 迁至本地或同机房；检查 p6spy 是否生产必需。

## 17. 枚举展示与下拉框排查（2026-10-11）

本节以当前后端源码为准，替代 16.2 中通过新增同名数据库字典补偿枚举的做法。`DictItemServiceImpl.init()` 已将项目内 `BaseEnum` 注册为完整类名的 snake_case 编码，因此应请求 `gender_enum`，而不是 `gender`。本轮没有修改数据库，也没有新增 SQL 变更集。

### 17.1 逐页结果

| 页面或组件 | 发现与修复 |
| --- | --- |
| 用户列表、搜索、新增/编辑 | 性别和启用状态改为 `gender_enum`、`dis_enable_status_enum`；编辑表单用下拉框并保留数值 0/1/2 |
| 个人中心 | 性别改用 `DictSelect`，数值提交契约不变 |
| 用户导入 | 补齐重复用户/邮箱/手机号策略和默认状态下拉框；对接 `/system/user/import/parse`、`/system/user/import` 及 `/system/user/import/template`，解析后再确认导入 |
| 部门列表、搜索、新增/编辑 | 统一状态字典编码，搜索和编辑均使用下拉框 |
| 角色列表、授权用户、数据范围 | 统一性别、数据范围字典编码；自定义范围保持数值 5 及部门选择条件 |
| 菜单列表、新增/编辑 | 菜单类型和状态改用枚举字典；类型选择使用下拉框，目录/菜单/按钮仍为数值 1/2/3 |
| 字典列表、字典项搜索、新增/编辑 | 状态改用 `dis_enable_status_enum` 下拉框和标签 |
| 文件列表、搜索 | 文件类型改用 `file_type_enum`；移除类型自由输入，改为下拉筛选 |
| 客户端配置列表、新增/编辑 | 认证方式、顶人范围、溢出下线方式补齐枚举下拉框；删除无效 `REFUSE` 选项；刷新传输方式使用 `COOKIE`/`BODY`；新增表单重置选项，编辑正确保存目标 ID |
| 存储配置列表、新增/编辑 | 类型改为数值 1/2 的 `storage_type_enum`；切换类型正确显示本地路径或对象存储字段；状态使用下拉框 |
| 短信配置列表、新增/编辑 | 供应商保留数据库字典 `sms_supplier`；状态使用枚举下拉框 |
| 系统日志列表、筛选、详情 | 成功/失败使用 `log_status_enum` 下拉框和标签 |
| 短信日志列表、筛选 | 删除 `OK`/`FAIL` 字符串选项，使用数值 1/2 的 `success_failure_status_enum` |
| 公告列表、搜索、发布/编辑、详情 | 分类保留 `notice_type`；范围改为数值 1/2，补齐通知用户多选及非空校验、通知方式多选；列表和详情增加发布状态标签 |
| 租户管理列表、新增/编辑 | 状态使用 `dis_enable_status_enum` 下拉框和标签 |
| 租户套餐列表、搜索、新增/编辑 | 删除搜索内的重复硬编码状态选项，统一使用枚举下拉框 |
| 登录、邮件、密码配置表单 | `LOGIN_CAPTCHA_ENABLED`、`MAIL_SSL_ENABLED`、`PASSWORD_ALLOW_CONTAIN_USERNAME`、`PASSWORD_REQUIRE_SYMBOLS` 使用“是/否”下拉框，提交仍为字符串 `1`/`0` |

### 17.2 共享组件与契约

- `useDict` 和 Pinia 字典 Store 合并同编码请求，响应更新后所有选择器和标签同步更新；空数组正常缓存，失败请求允许重试。
- `DictSelect` 使用真实请求 loading，区分空选项与加载失败，提供重试；`dictCode` 变化时重新加载。
- `UserSelect` 显式支持多选模型，公告通知用户提交字符串 ID 数组。
- 当前页面使用的枚举编码为 `gender_enum`、`dis_enable_status_enum`、`menu_type_enum`、`data_scope_enum`、`file_type_enum`、`storage_type_enum`、`auth_type_enum`、`logout_mode_enum`、`replaced_range_enum`、`log_status_enum`、`success_failure_status_enum`、`notice_scope_enum`、`notice_method_enum`、`notice_status_enum`、`import_policy_enum`。
- 数据库字典 `notice_type`、`client_type`、`sms_supplier` 保留原编码；客户端刷新传输方式来自 Starter，未假设存在对应项目字典。
- 调度、代码生成页面仍为原有占位入口；未为尚未实现的字段虚构枚举表单。消息演示和上传进度没有对应可编辑枚举字段。

### 17.3 验证与限制

- 已运行前端 `pnpm typecheck`、`pnpm build`；受影响目录/文件执行不带 `--fix` 的 Oxlint 和 Vue ESLint。
- `tests/dictionary.browser.mjs` 覆盖数值 0、同编码请求合并、缓存更新、编码切换、空选项、失败和重试。
- `tests/enum-forms.browser.mjs` 在真实组件上模拟 API，检查用户/客户端编辑回填、菜单/角色条件字段、短信状态展示/筛选、存储、公告、布尔参数及导入策略和失败重试；不操作真实数据库。
- 存储表单完成桌面/移动端截图核对，导入表单完成移动端截图核对；客户端和存储弹窗沿用组件库并限制移动端宽度。
- 图谱 MCP 的项目/覆盖查询、索引刷新及影响检测均因 `Transport closed` 无法完成。使用 `rg` 和源码读取核对前端消费者、API 类型以及后端枚举、Controller、DTO 和字典注册逻辑，不声称已取得图谱覆盖度。
- 未执行真实登录会话下的接口与 Excel 集成导入；直接请求受保护枚举接口返回 401。`frontend-spec` 技能未安装，按现有 Vue/Naive UI、类型和构建约定实施。
