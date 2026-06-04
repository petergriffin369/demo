# 版本迭代记录

## V0.1 - 页面框架
- 创建项目文件结构
- 实现顶部导航和页面切换
- 完成首页概览

## V0.2 - 数据结构
- 定义老人档案、人员资源、求助记录、工单数据结构
- 实现 localStorage 读写（storage.js）
- 载入初始模拟数据（data.js）

## V0.3 - 报平安与求助提交
- 实现老人/家属端表单
- 快速填充示例按钮
- 数据保存到 localStorage

## V0.4 - AI 风险识别
- 实现嵌入式 AI 规则引擎（aiEngine.js）
- 风险等级识别（低/中/高）
- 事件类型分类
- 触发原因生成
- AI 置信度模拟
- 建议处置和责任人推荐

## V0.5 - 人工复核和工单生成
- 实现网格员复核页面
- AI 结果保留和人工修改记录
- 工单创建逻辑（workorderService.js）

## V0.6 - 工单调度和协同处理
- 工单列表与筛选
- 派单确认与改派
- 协同处理角色选择
- 处理结果填写和家属评价

## V0.7 - 管理驾驶舱
- 统计卡片展示（dashboardService.js）
- 风险分布和工单状态分布
- 重点老人列表
- 服务复盘建议自动生成

## V0.8 - 数据导入导出
- 数据记录页面三表展示
- JSON 导出下载
- JSON 文本导入
- 示例数据载入和清空

## V1.0 - 演示文档完善
- AI 功能说明页面
- 系统文档页面（含功能联调记录表）
- README.md 完整文档
- AI_FUNCTION_DEMO.md
- INTEGRATION_RECORD.md

## V1.1 - 功能增强与安全优化

### 新增功能
- 推荐责任主体与处理时限展示
- 可解释规则说明（状态规则、设备规则、文本规则、分类规则、综合规则）
- 协同处理留痕（processRole、acceptedAt、completedAt、photoUploaded）
- AI 修改留痕（isAiModified 字段）
- 中高风险二次确认
- 累计指标统计（totalRecordCount、totalOrderCount）
- escapeHtml 安全防护
- JSON 导入结构校验

### Bug 修复
- 修复"查看全部记录"按钮跳转到不存在的 careRecordsSection

### 页面优化
- 协同处理页仅显示"已派单"和"处理中"工单
- 工单详情页补充完整字段
- 数据记录表增加多列
- 示例数据时间使用 getNow() 动态生成

## V1.2 - 系统产品化（当前版本）

### 首页重构
- 首页从课堂演示介绍页改为系统工作台：
  - 关键指标卡片（老人档案数、今日报平安/求助、风险提醒、待处理工单、处理中工单、已完成工单、高风险事件）
  - 核心业务流程卡片（信息采集、AI 风险识别、人工复核、工单调度、协同处理、服务复盘），点击可跳转
  - 待处理事项列表（待复核记录、待派单工单、处理中工单、高风险未完成），点击可跳转
  - 快捷操作按钮（新增报平安/求助、查看智能风险识别、查看工单调度、查看管理驾驶舱）

### 课堂内容清理
- 移除首页"课堂演示闭环进度"模块
- 移除首页"建议课堂演示路径"模块
- 移除各页面顶部"步骤 X/8 当前环节"提示
- 移除 DEMO_STEPS、renderDemoProgress()、renderCurrentStepHint() 函数
- 移除 .demo-progress、.demo-path、.step-hint 等 CSS 样式

### 新增
- STABILITY_CHECK.md 稳定性检查报告
- 工作台样式（section-label、pending-list、pending-item、quick-actions、quick-btn）
