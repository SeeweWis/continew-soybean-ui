# 审批插件前端与接口

面向管理员和业务用户，提供审批定义、发起审批、我的申请、待办/已办、详情和操作历史。沿用 Vue 3、Naive UI、请求封装、动态菜单和权限判断，不增加组件依赖。

## 已完成

- 审批定义查询、分类/状态筛选、新建、查看、编辑、删除；顺序节点支持指定用户、会签和或签，可调整节点顺序。
- 发起审批选择已启用模板，先预览审批人和会签/或签规则，再填写申请事项和模板定义的动态申请字段；业务类型和业务单号由页面按模板自动生成，不要求用户填写技术字段。
- “我的申请”页面直接打开右侧发起审批抽屉；原 `/approval/start` 路由保留并自动跳转到“我的申请”，兼容已有链接。
- 审批定义采用四步编辑：基本信息、审批节点、申请字段、审批预览；申请字段步骤通过左侧组件库、中央拖拽画布和右侧属性面板设计，支持文本、数字、金额、日期、日期范围、下拉和单选字段。
- 发起页桌面端采用左表单、右流程预览的双栏布局；窄屏自动上下排列，流程预览会随审批类型实时更新。
- 流程定义编辑会提示“已发布模板只影响新申请，在途申请使用原快照”；单人节点不再要求用户选择会签/或签。
- 我的申请和待办/已办提供服务端分页；详情展示内容、任务、操作历史和参与人姓名。
- 详情先展示申请标题、状态、当前处理人和个人任务状态，再展示业务信息、申请内容、任务表和历史；审批编码、申请编号等技术字段收进“技术信息”。
- 同意、拒绝、转办、撤销具备权限控制、提交 loading 和防重复点击；失败保留输入，拒绝/撤销明确提示结束流程。
- 后端按当前用户、当前租户查询；详情仅限发起人或被分配过任务的参与者；全局按钮权限不绕过归属校验。
- 流程定义保存及发起共用校验器，审批人须为当前租户的有效用户。当前仅支持指定用户，角色/部门/自选类型不开放。
- 实例保存发起时的流程和表单配置快照；任务处理在同一事务中锁定实例，再锁任务读取最新状态，避免同一实例被并发推进。
- 后端校验表单字段编号、类型、必填项、文本/数字范围、选择项和提交数据；扩展业务字段只接受安全编码并限制字段数量，防止只依赖前端校验。
- 业务页面可复用 `src/components/approval/approval-submit-modal.vue`：左侧传入当前业务可用字段，右侧组合固定字段和临时业务字段；通过 `field-{key}` 插槽接入附件上传或其他自定义控件，提交时 `formData` 允许安全命名的扩展字段。
- 或签推进时取消其他待办；会签计算忽略被转办的旧任务；流程结束清空当前节点。

## 接口矩阵

请求使用现有 Authorization 和 X-Tenant-Id 上下文，响应继续由全局 R 包装。分页请求为 page/size，结果为 list/total。雪花 ID 使用 string | number，大于 JS 安全整数范围时以字符串传输。

| 请求 | 用途 | 权限 |
| --- | --- | --- |
| GET /approval/definition/list | 定义列表，name/category/status | approval:definition:list |
| GET /approval/definition/{id} | 定义详情，包含 flowConfig、formConfig 字符串 | approval:definition:get |
| POST /approval/definition | 新增定义，提交 flowConfig、formConfig | approval:definition:create |
| PUT /approval/definition/{id} | 更新定义，编码不可改变，提交 flowConfig、formConfig | approval:definition:update |
| DELETE /approval/definition | 请求体 { ids: [...] } | approval:definition:delete |
| POST /approval/instance/start | 发起，返回实例 ID | approval:instance:start |
| GET /approval/instance | 我的申请，可筛选 title/businessType/status | approval:instance:list |
| GET /approval/instance/{id} | instance/tasks/history/userNames | approval:instance:get |
| POST /approval/instance/cancel/{id} | reason，仅发起人可撤销 | approval:instance:cancel |
| GET /approval/task | 我的任务，title、completed=false/true | approval:task:list |
| POST /approval/task/approve/{id} | opinion/attachments | approval:task:approve |
| POST /approval/task/reject/{id} | opinion/attachments | approval:task:reject |
| POST /approval/task/transfer/{id} | toUserId/reason | approval:task:transfer |

业务内容使用 `formData` JSON 保存，固定字段由定义中的 `formConfig` 决定，业务页面可在提交弹窗中加入扩展字段。附件接口字段保持兼容，附件上传控件通过弹窗插槽接入；字段联动和嵌套表格仍需具体业务确认后再扩展。

## SQL 与权限

后端两个 dialect/plugin/plugin_approval.sql 都包含五个变更集。新增第五个变更集后，发起审批权限会挂到“我的申请”菜单下，独立“发起审批”页面菜单消失。已执行原始变更集的数据库会继续执行新增变更集，无需重跑建表；若曾手工执行历史 SQL，升级前必须核对 Liquibase checksum 和实际结构。

菜单 ID 为 10000、10010–10015、10020–10021、10030–10033、10040–10044，component 对应 src/views/approval 下四个页面。不要执行前端 docs/sql/sys_menu.sql 的旧 RuoYi 表结构补丁。

默认租户 0 的 sys_admin 角色获得定义管理和业务操作权限；general 角色获得发起、本人申请与任务处理权限及选择定义所需只读权限。super_admin 沿用框架超级权限，不修改其角色。其他租户通过既有套餐、角色分配审批菜单，不自动扩大套餐可用范围。

快照迁移只能复制当前尚存定义，无法重建历史版本。升级前应核对 PENDING 实例的 current_node_id 是否仍在相应流程内、是否存在未完成节点配置变动；无法还原的申请须由管理员按业务记录恢复快照或按既有操作撤销重提。引擎发现缺失或不匹配快照会在修改任务前阻断，保留待办。旧定义内容与历史完全一致与否仍需人工核对。

菜单变更集包含回滚 SQL。快照变更回滚将移除快照列并恢复原全局编码唯一约束，必须先处理跨租户同编码数据，否则数据库拒绝恢复唯一约束。建议先备份，在测试环境验证迁移/回滚后再发布。

## 验证

- pnpm typecheck、pnpm build 已通过。
- python3 tests/approval-menu.test.py 验证双数据库菜单、权限、角色授权和前端视图一致。
- pnpm exec tsx tests/approval-flow.test.ts 验证流程和表单配置校验、重复节点、审批人、枚举及大 ID。
- tests/approval.browser.mjs 使用现有 Vite 服务和模拟 API，验证动态路由、两步定义新建/编辑、错误重试、动态表单发起、详情、同意/拒绝/转办/撤销、无权限及移动端抽屉。当前环境没有 Playwright 模块和浏览器可执行文件，本轮只完成 node --check，未执行浏览器运行验证。
- 后端 ./mvnw verify 的 14 个 Reactor 模块全部通过，审批测试共 11 个，覆盖归属、跨租户、过期节点、会签转办和或签清理、旧快照不匹配、固定字段和业务扩展字段校验。
- MySQL/PostgreSQL Liquibase 离线 updateSQL 验证变更集解析；离线解析不证明 SQL 能在真实数据库执行。
- 未连接数据库执行迁移/回滚，未启动后端、未做真实账号和事务并发集成测试，未验证独立业务系统审批结果回写。浏览器模拟 API 与 Mapper mock 单测不能替代这些验收。

## 后续能力

按具体业务接入审批结果回写；只有出现明确需求后才扩展角色/部门审批人、抄送、提醒、附件、字段联动或嵌套表格。
