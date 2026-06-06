/**
 * server.js - 社区独居老人照护风险预警与服务调度系统
 * DeepSeek 大语言模型 API 本地代理服务
 *
 * 职责：
 * 1. 接收前端传来的老人求助记录，调用 DeepSeek Chat API 进行风险识别
 * 2. 校验并规范化模型返回的 JSON
 * 3. API Key 仅存放在 server/.env，不暴露到前端
 * 4. 所有失败路径统一返回 fallback，供前端切换至规则引擎兜底
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai").default;

// ======================== 配置 ========================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const PORT = parseInt(process.env.PORT, 10) || 3001;
const REQUEST_TIMEOUT_MS = 25 * 1000; // 接口超时 25 秒

// ======================== Express ========================

const app = express();

// CORS：允许前端（任意来源）调用本代理
app.use(cors());
// JSON 请求体解析，上限 1 MB
app.use(express.json({ limit: "1mb" }));

// ======================== OpenAI 客户端 ========================

/** 仅在 API Key 已配置时才创建客户端，否则留空以便优雅降级 */
let openaiClient = null;
if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith("sk-")) {
  openaiClient = new OpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey: DEEPSEEK_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
}

// ======================== 系统提示词 ========================

const SYSTEM_PROMPT = `你是"社区独居老人照护风险预警与服务调度系统"的智能辅助模块。
你只能做风险识别、事件分类、触发原因提取、推荐责任主体和推荐处理时限。
你不能做医疗诊断，不能输出治疗方案，不能替代医生或网格员决策。
所有结果仅供人工复核参考。
高风险事件必须提示人工复核和及时通知网格员/社区医生。
你只能输出 JSON，不要输出 Markdown，不要输出解释性段落。

风险等级定义（三选一）：
- 低风险：状态正常、无设备提醒、描述无异常关键词
- 中风险：轻微不适、长时间未活动、两天未报平安、头晕/乏力/不舒服、家属反馈异常
- 高风险：紧急求助、跌倒提醒、烟感提醒、跌倒/摔倒/昏迷/胸闷/联系不上/呼吸困难/报警/严重/突发

事件类型（六选一）：
- 健康类：身体不适、疾病、受伤、用药相关
- 维修类：家电维修、水电维修、房屋修缮
- 生活服务类：代购、送餐、打扫、缴费
- 陪诊类：就医陪同、挂号、复诊
- 无异常：正常报平安、无特殊需求
- 其他：无法归入上述类别的请求

派单规则：
- 健康类 + 高风险 → 社区医生 + 网格员，30 分钟内响应
- 健康类 + 中风险 → 网格员电话核实，必要时社区医生随访，2 小时内响应
- 维修类 → 物业/维修人员，4 小时内响应
- 生活服务类 → 志愿者或网格员，当日响应
- 陪诊类 → 志愿者 + 家属确认，1 日内安排
- 低风险 → 系统留痕，纳入常规巡访，按巡访计划处理

输出格式（必须是纯 JSON，不要标记语言包裹）：
{
  "riskLevel": "低风险/中风险/高风险",
  "eventType": "健康类/维修类/生活服务类/陪诊类/无异常/其他",
  "confidence": 0.85,
  "reasons": ["原因1", "原因2"],
  "suggestion": "处置建议",
  "assignee": "推荐责任主体",
  "deadline": "推荐处理时限"
}`;

// ======================== 校验函数 ========================

const VALID_RISK_LEVELS = ["低风险", "中风险", "高风险"];
const VALID_EVENT_TYPES = ["健康类", "维修类", "生活服务类", "陪诊类", "无异常", "其他"];

/**
 * 校验 DeepSeek 返回的 JSON 是否包含必要字段且类型正确
 * @param {Object} parsed
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAiResult(parsed) {
  const errors = [];

  if (!parsed.riskLevel || !VALID_RISK_LEVELS.includes(parsed.riskLevel)) {
    errors.push("riskLevel 必须是 低风险 / 中风险 / 高风险 之一");
  }
  if (!parsed.eventType || !VALID_EVENT_TYPES.includes(parsed.eventType)) {
    errors.push("eventType 必须是 健康类 / 维修类 / 生活服务类 / 陪诊类 / 无异常 / 其他 之一");
  }
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0.60 || parsed.confidence > 0.98) {
    errors.push("confidence 必须是 0.60 ~ 0.98 之间的数字");
  }
  if (!Array.isArray(parsed.reasons)) {
    errors.push("reasons 必须是数组");
  }
  if (typeof parsed.suggestion !== "string" || parsed.suggestion.trim().length === 0) {
    errors.push("suggestion 必须是非空字符串");
  }
  if (typeof parsed.assignee !== "string" || parsed.assignee.trim().length === 0) {
    errors.push("assignee 必须是非空字符串");
  }
  if (typeof parsed.deadline !== "string" || parsed.deadline.trim().length === 0) {
    errors.push("deadline 必须是非空字符串");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 清理模型输出中可能包裹的 Markdown 代码块标记
 * 例如 ```json ... ``` 或 ``` ... ```
 */
function stripMarkdownCodeBlock(text) {
  let cleaned = text.trim();
  // 去掉 ```json 或 ``` 开头
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
  // 去掉末尾 ```
  cleaned = cleaned.replace(/\n?```\s*$/i, "");
  return cleaned.trim();
}

// ======================== 构建用户提示词 ========================

/**
 * 将前端传入的记录对象转为给 DeepSeek 的用户提示
 */
function buildUserPrompt(record) {
  const desc = record.description || "";
  const status = record.status || "";
  const deviceAlert = record.deviceAlert || "无";
  const age = record.age || "";
  const healthTags = Array.isArray(record.healthTags) ? record.healthTags : [];
  const serviceLevel = record.serviceLevel || "";

  const parts = [
    "请对该老人照护事件进行风险识别，只输出 JSON：",
    "",
    `描述：${desc || "（无）"}`,
    `今日状态：${status || "（无）"}`,
    `设备提醒：${deviceAlert}`,
  ];

  if (age) {
    parts.push(`年龄：${age} 岁`);
  }
  if (healthTags.length > 0) {
    parts.push(`健康标签：${healthTags.join("、")}`);
  }
  if (serviceLevel) {
    parts.push(`服务等级：${serviceLevel}`);
  }

  return parts.join("\n");
}

// ======================== 路由 ========================

/** GET /api/health — 健康检查 */
app.get("/api/health", (_req, res) => {
  const hasKey = !!(DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith("sk-"));
  res.json({
    status: "ok",
    service: "eldercare-ai-server",
    deepseekConfigured: hasKey,
    model: hasKey ? DEEPSEEK_MODEL : null,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 核心分析逻辑 — 供各端点复用
 * @param {Object} record 已脱敏的老人照护记录
 * @returns {Object} { ok, aiResult } | { ok, fallback, message }
 */
async function performAnalysis(record) {
  // 基础入参校验
  if (!record || typeof record !== "object" || Object.keys(record).length === 0) {
    return { ok: false, fallback: true, message: "DeepSeek 大语言模型调用失败，建议使用规则引擎兜底" };
  }

  // 未配置 API Key
  if (!openaiClient) {
    return { ok: false, fallback: true, message: "DeepSeek 大语言模型调用失败，建议使用规则引擎兜底" };
  }

  const userPrompt = buildUserPrompt(record);

  const completion = await openaiClient.chat.completions.create({
    model: DEEPSEEK_MODEL,
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const rawContent =
    completion.choices &&
    completion.choices[0] &&
    completion.choices[0].message &&
    completion.choices[0].message.content
      ? completion.choices[0].message.content
      : "";

  if (!rawContent || rawContent.trim().length === 0) {
    throw new Error("模型返回空内容");
  }

  const jsonText = stripMarkdownCodeBlock(rawContent);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseErr) {
    throw new Error("模型输出 JSON 解析失败: " + parseErr.message);
  }

  const validation = validateAiResult(parsed);
  if (!validation.valid) {
    throw new Error("模型输出校验失败: " + validation.errors.join("; "));
  }

  return {
    ok: true,
    aiResult: {
      riskLevel: parsed.riskLevel,
      eventType: parsed.eventType,
      confidence: parsed.confidence,
      reasons: parsed.reasons,
      suggestion: parsed.suggestion,
      assignee: parsed.assignee,
      deadline: parsed.deadline,
      modelProvider: "DeepSeek",
      modelName: DEEPSEEK_MODEL,
      aiModeUsed: "llm",
      fallback: false,
      privacyProtected: true,
    },
  };
}

/** POST /api/analyze — 风险识别（直接传 record） */
app.post("/api/analyze", async (req, res) => {
  try {
    const result = await performAnalysis(req.body || {});
    return res.json(result);
  } catch (err) {
    console.error("[DeepSeek] 调用失败:", err.message);
    return res.json({
      ok: false,
      fallback: true,
      message: "DeepSeek 大语言模型调用失败，建议使用规则引擎兜底",
    });
  }
});

/** POST /api/analyze-care-request — 风险识别（前端标准接口，请求体 { record: {...} }） */
app.post("/api/analyze-care-request", async (req, res) => {
  try {
    const record = (req.body && req.body.record) ? req.body.record : (req.body || {});
    const result = await performAnalysis(record);
    return res.json(result);
  } catch (err) {
    console.error("[DeepSeek] 调用失败:", err.message);
    return res.json({
      ok: false,
      fallback: true,
      message: "DeepSeek 大语言模型调用失败，建议使用规则引擎兜底",
    });
  }
});

// ======================== 启动服务 ========================

app.listen(PORT, () => {
  const hasKey = !!(DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith("sk-"));
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  社区独居老人照护风险预警与服务调度系统");
  console.log("  DeepSeek AI 本地代理服务");
  console.log("═══════════════════════════════════════════");
  console.log(`  监听端口 : ${PORT}`);
  console.log(`  DeepSeek  : ${hasKey ? "已配置 ✓" : "未配置 ✗（将直接返回 fallback）"}`);
  console.log(`  模型      : ${hasKey ? DEEPSEEK_MODEL : "N/A"}`);
  console.log("═══════════════════════════════════════════");
  console.log("");
});
