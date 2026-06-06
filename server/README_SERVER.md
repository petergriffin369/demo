# 社区独居老人照护风险预警与服务调度系统 — DeepSeek AI 本地代理服务

## 简介

本目录是系统的 **DeepSeek 大语言模型 API 本地代理服务**，用于满足审计整改中"F1 无真实大模型支撑"的要求。

服务运行在本地 `localhost:3001`，前端通过 HTTP 请求将老人照护事件数据发送到本服务，由本服务调用 DeepSeek Chat API 进行智能风险识别，并将结果返回前端。**API Key 仅存放在本地的 `server/.env` 中，绝不写入前端代码。**

当 DeepSeek API 不可用（Key 错误、网络不通、超时、模型返回异常等）时，服务统一返回 `fallback: true`，前端自动切换至现有的规则引擎兜底。

---

## 快速开始

### 1. 进入 server 目录

```bash
cd server
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 API Key

```bash
# 复制环境变量模板
cp .env.example .env
```

打开 `.env`，填入你的真实 DeepSeek API Key：

```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **安全提醒**：`.env` 已加入 `.gitignore`，请勿将 API Key 提交到 Git 仓库或写入前端代码。

### 4. 启动服务

```bash
npm start
```

### 5. 检查服务状态

在浏览器或终端访问：

```
http://localhost:3001/api/health
```

预期返回：

```json
{
  "status": "ok",
  "service": "eldercare-ai-server",
  "deepseekConfigured": true,
  "model": "deepseek-chat",
  "timestamp": "2026-06-06T..."
}
```

---

## API 接口

### GET /api/health

健康检查。返回服务状态和 DeepSeek 是否已配置。

### POST /api/analyze

风险识别。请求体为老人照护事件记录：

```json
{
  "description": "老人今天说头晕，家属联系不上，情况比较紧急。",
  "status": "紧急求助",
  "deviceAlert": "跌倒提醒",
  "age": 68,
  "healthTags": ["独居", "行动不便"],
  "serviceLevel": "重点关注",
  "privacyNotice": "已脱敏，不包含完整姓名、电话、门牌号和紧急联系人信息"
}
```

#### 成功返回

```json
{
  "ok": true,
  "aiResult": {
    "riskLevel": "高风险",
    "eventType": "健康类",
    "confidence": 0.95,
    "reasons": ["描述包含'头晕'", "今日状态为'紧急求助'"],
    "suggestion": "立即派单，通知家属和社区医生，网格员同步上门核实。",
    "assignee": "社区医生 + 网格员",
    "deadline": "30 分钟内响应",
    "modelProvider": "DeepSeek",
    "modelName": "deepseek-chat",
    "aiModeUsed": "llm",
    "fallback": false,
    "privacyProtected": true
  }
}
```

#### 失败返回（触发规则引擎兜底）

```json
{
  "ok": false,
  "fallback": true,
  "message": "DeepSeek 大语言模型调用失败，建议使用规则引擎兜底"
}
```

---

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填） | — |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 使用的模型名称 | `deepseek-chat` |
| `PORT` | 服务监听端口 | `3001` |

---

## 容错策略

| 场景 | 行为 |
|------|------|
| 未配置 API Key | 直接返回 `fallback: true` |
| API Key 格式无效 | 返回 `fallback: true` |
| 网络不通 / 超时 | 捕获异常，返回 `fallback: true` |
| 模型返回空内容 | 返回 `fallback: true` |
| JSON 解析失败 | 返回 `fallback: true` |
| 字段校验不通过 | 返回 `fallback: true` |

所有失败路径 **不会让服务崩溃**，前端始终能收到一个合法的 JSON 响应。

---

## 注意事项

1. **API Key 绝不能提交到仓库** — `.env` 已在 `.gitignore` 中排除。
2. **API Key 不能写入前端代码** — 仅存放在 `server/.env`。
3. 本服务设计为仅在内网/localhost 运行，请勿直接暴露到公网。
4. 现有规则引擎（`js/aiEngine.js`）保持不变，作为 API 不可用时的兜底方案。
