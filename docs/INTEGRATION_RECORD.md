# 接口/功能联调记录

| 编号 | 模块名称 | 输入 | 输出 | 触发函数 | 联调结果 | 问题与处理方式 |
|------|---------|------|------|---------|---------|--------------|
| F01 | 报平安表单 → AI 风险识别 | 老人姓名、状态、描述、设备提醒 | 求助记录（含 LLM/规则引擎 AI 结果） | `analyzeRequestDefault(record)` | 通过 | 优先调用 DeepSeek LLM，失败自动降级规则引擎；PII 脱敏后发送 |
| F02 | AI 风险识别 → 推荐责任主体/处理时限 | AI 识别结果（事件类型、风险等级） | 推荐责任人和时限 | `recommendAssignee(eventType, riskLevel)` | 通过 | 健康高风险→社区医生+网格员/30分钟，维修→物业/4小时等规则 |
| F03 | AI 风险识别 → 可解释规则展示 | 求助记录、AI 结果 | 状态规则、设备规则、文本规则、分类规则、综合规则 | `buildExplainableRules(record, ai)` | 通过 | 五类规则清晰展示 AI 判断依据 |
| F04 | AI 风险识别 → 人工复核 | AI 识别结果 | 复核后的最终风险等级（含 AI 修改留痕） | `renderReviewPage()` | 通过 | AI 判断和人工判断均需保存，isAiModified 记录是否修改 |
| F05 | 人工复核 → 二次确认 | 中/高风险 + 不生成工单 | confirm 确认框 | `submitReview()` | 通过 | 提示"当前为中/高风险，建议生成工单。确定仅留痕吗？" |
| F06 | 人工复核 → 工单生成 | 复核结果 | 服务工单 | `createWorkOrder(record, reviewInfo)` | 通过 | 低风险且不生成工单时仅留痕 |
| F07 | 工单生成 → 派单推荐 | 事件类型、风险等级 | 推荐责任人和时限 | `recommendAssignee(eventType, riskLevel)` | 通过 | 不同类型对应不同责任人和时限规则 |
| F08 | 工单调度 → 改派记录和详情展示 | 改派原因、新责任人 | 改派历史记录和工单详情 | `assignWorkOrder()` / `showWorkOrderDetail()` | 通过 | 改派记录表格化展示，含时间、原责任人、新责任人、原因 |
| F09 | 工单调度 → 确认派单 | 待派单工单 | 状态变更为已派单 | `confirmAssign(orderId)` | 通过 | 确认派单后方可在协同处理页看到 |
| F10 | 协同处理 → 接单留痕 | 处理角色 | 记录 processRole 和 acceptedAt | `acceptOrder(orderId)` | 通过 | 读取当前选中的角色选择器，记录接单时间和角色 |
| F11 | 协同处理 → 上传照片留痕 | 模拟上传照片 | 记录 photoUploaded: true | `fakeUpload()` / `finishOrder()` | 通过 | 按钮状态和工单 photoUploaded 字段同步 |
| F12 | 协同处理 → 完成评价留痕 | 处理结果、评价、备注、照片状态 | 记录 completedAt、rating、ratingComment | `completeWorkOrder()` | 通过 | 所有字段在工单详情和数据记录中可见 |
| F13 | 协同处理 → 工单筛选 | 工单状态 | 仅显示"已派单"和"处理中" | `renderCollaborationPage()` | 通过 | "待派单"需先在工单调度页确认派单 |
| F14 | 派单处理 → 管理看板 | 工单状态和处理结果 | 统计指标和复盘建议 | `calculateDashboardMetrics(state)` | 通过 | 管理看板实时从 state 计算指标，支持今日/累计 |
| F15 | 管理驾驶舱 → 今日/累计指标 | state 全量数据 | todayRecordCount、totalRecordCount、totalOrderCount 等 | `calculateDashboardMetrics(state)` | 通过 | 示例数据使用当天日期，确保演示时今日数据不为 0 |
| F16 | 管理驾驶舱 → AI 修改统计 | record.isAiModified | AI修改次数 | `calculateDashboardMetrics(state)` | 通过 | 优先基于 isAiModified 字段统计 |
| F17 | 管理驾驶舱 → 复盘建议 | 工单和记录数据 | 高风险未完成、AI修改、不满意评价等建议 | `generateReviewAdvice()` | 通过 | 新增三类复盘规则 |
| F18 | 数据记录 → 本地存储 | 所有 state 数据 | localStorage 持久化 | `saveState(state)` / `getState()` | 通过 | 键名统一为 `eldercare_ai_demo_state` |
| F19 | JSON 导入 → 结构校验 | JSON 字符串 | 校验通过/失败提示 | `importData(json)` | 通过 | 校验 elders、resources、careRecords、workOrders 四个数组 |
| F20 | XSS 防护 → HTML 转义 | 用户输入文本 | 转义后的安全文本 | `escapeHtml(text)` | 通过 | 所有用户输入均已转义 |
| F21 | 首页 → 工作台指标 | state 全量数据 | 关键指标卡片、待处理列表、快捷操作 | `renderHome()` | 通过 | 首页从课堂演示页改为系统工作台，重命名为首页概览 |
| F22 | 隐私保护 → 数据脱敏 | 电话/地址/紧急联系人 | 脱敏后显示（138****0001） | `maskPhone()` / `maskAddress()` / `maskEmergencyContact()` | 通过 | 点击"显示完整信息"临时授权查看 |
| F23 | 审计日志 → 操作留痕 | 关键操作触发 | 写入 state.auditLogs[] | `addAuditLog()` | 通过 | 日志含 logId/action/operatorRole/targetType/targetId/detail/createdAt |
| F24 | 审计日志 → 数据展示 | state.auditLogs | 最近100条倒序表格 | `renderDataTables()` | 通过 | 含时间/操作角色/操作类型/对象类型/对象编号/操作说明 |
| F25 | 导出/导入 → 日志完整性 | JSON 导出 | 含 auditLogs 字段 | `exportData()` / `importData()` | 通过 | 导出 JSON 包含完整审计日志 |

## 联调说明

所有模块间通过全局状态对象 `state` 进行数据传递，`state` 存储在 `localStorage` 中，键名为 `eldercare_ai_demo_state`。

数据流转路径：
```
用户提交表单 → state.careRecords[] 
→ AI 引擎分析 → 更新 record.aiResult 
→ 人工复核 → 更新 record.reviewed / record.reviewInfo / record.isAiModified 
→ 生成工单 → state.workOrders[] 
→ 确认派单 → order.status = '已派单'
→ 协同处理 → 更新 order.status / result / rating / processRole / acceptedAt / completedAt / photoUploaded 
→ 管理看板 → 统计计算（今日/累计指标）
→ 审计日志 → 每个操作节点写入 log（action + operatorRole + targetId + detail）
→ 数据脱敏 → 电话/地址/紧急联系人在 UI 层自动掩码
→ 导出/导入 → JSON 包含完整 auditLogs
→ 首页工作台 → 关键指标、待处理事项、快捷操作
```
