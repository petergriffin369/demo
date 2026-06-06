# 社区独居老人照护风险预警与服务调度系统

**版本：V2.0 | 前端原型 + DeepSeek LLM 本地代理**

## 快速启动

### 前端（必需）
双击 `index.html` 即可在浏览器中运行。

### DeepSeek AI 代理（可选，需 Node.js）
```bash
cd server
cp .env.example .env          # 编辑 .env 填入真实 API Key
npm install
npm start                     # 默认监听 http://localhost:3001
```

> 不启动 server 也不影响系统运行——AI 会自动降级为规则引擎兜底。

## 系统简介

面向社区网格员、社区医生、物业维修人员、志愿者和老人家属，提供照护风险预警、智能识别、工单调度与协同处理服务。

### 核心功能
- 老人/家属端：报平安提交与求助上报
- **AI 风险识别：默认 DeepSeek 大语言模型，失败自动降级规则引擎兜底**
- 网格员人工复核与纠错
- 工单调度与派单
- 多角色协同处理
- 管理驾驶舱与复盘建议
- 风险规则可配置
- 隐私保护：数据脱敏、审计日志、PII 发送前脱敏

### 技术栈
- 纯 HTML + CSS + JavaScript（ES5+）
- 数据存储：浏览器 localStorage
- AI 引擎：DeepSeek Chat API（deepseek-chat）+ 本地规则引擎兜底
- 后端代理：Node.js + Express（`server/`），API Key 仅存服务端

## 文档索引

| 文档 | 说明 |
|---|---|
| [docs/README.md](docs/README.md) | 完整项目说明 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 版本迭代记录（V0.1–V2.0） |
| [docs/AI_FUNCTION_DEMO.md](docs/AI_FUNCTION_DEMO.md) | AI 辅助功能说明 |
| [docs/INTEGRATION_RECORD.md](docs/INTEGRATION_RECORD.md) | 功能联调记录 |
| [docs/STABILITY_CHECK.md](docs/STABILITY_CHECK.md) | 稳定性检查报告 |
| [docs/AUDIT_FIX_REPORT.md](docs/AUDIT_FIX_REPORT.md) | 审计整改报告 |
| [server/README_SERVER.md](server/README_SERVER.md) | DeepSeek 代理服务说明 |

## 注意事项

- 系统默认使用 DeepSeek 大语言模型进行风险识别，不可用时自动降级为规则引擎兜底
- API Key 仅存放在 `server/.env` 中，绝不会写入前端代码或提交到仓库
- 发送 LLM 前自动对姓名、电话、门牌号等敏感信息做脱敏处理
- 系统不输出医疗诊断或治疗方案，所有 AI 结果必须经人工复核
- 所有数据仅存储在浏览器本地，刷新/关闭后保留，清缓存会丢失
