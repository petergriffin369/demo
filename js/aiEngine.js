/**
 * aiEngine.js - 嵌入式 AI 模拟引擎
 * 功能：文本分类、风险评分、触发原因生成、派单推荐
 * 基于规则引擎模拟，不调用外部 API
 */

/**
 * 获取合并后的关键词规则（默认 + 自定义）
 * @returns {Object} 合并后的关键词映射
 */
function getMergedRiskKeywords() {
  var custom = (window.appState && window.appState.customRiskKeywords) ? window.appState.customRiskKeywords : {};
  var categories = ['high', 'medium', 'health', 'maintenance', 'life', 'companion'];
  var merged = {};
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var defaults = RISK_KEYWORDS[cat] || [];
    var customs = (custom[cat] && Array.isArray(custom[cat])) ? custom[cat] : [];
    merged[cat] = defaults.concat(customs);
  }
  return merged;
}

/**
 * 检查关键词是否为自定义关键词
 * @param {string} keyword 关键词
 * @param {string} category 规则分类
 * @returns {boolean}
 */
function isCustomKeyword(keyword, category) {
  var custom = (window.appState && window.appState.customRiskKeywords) ? window.appState.customRiskKeywords : {};
  var customs = (custom[category] && Array.isArray(custom[category])) ? custom[category] : [];
  return customs.indexOf(keyword) !== -1;
}

/**
 * 分析求助记录，返回 AI 识别结果
 * @param {Object} record 求助记录
 * @returns {Object} 包含 riskLevel, eventType, reasons, confidence, suggestion 的结果
 */
function analyzeRequest(record) {
  const eventType = classifyEventType(record);
  const riskLevel = calculateRiskLevel(record);
  const reasons = generateReasons(record, riskLevel, eventType);
  const confidence = calculateConfidence(record, reasons, riskLevel);
  const suggestion = generateSuggestion(riskLevel, eventType, record);

  return {
    riskLevel: riskLevel,
    eventType: eventType,
    confidence: confidence,
    reasons: reasons,
    suggestion: suggestion
  };
}

/**
 * 分类事件类型
 * @param {Object} record 求助记录
 * @returns {string} 事件类型
 */
function classifyEventType(record) {
  const desc = (record.description || '').toLowerCase();
  const requestType = record.requestType || '';
  const status = record.status || '';
  const keywords = getMergedRiskKeywords();

  // 求助类型直接映射
  if (requestType === '健康') return '健康类';
  if (requestType === '维修') return '维修类';
  if (requestType === '生活') return '生活服务类';
  if (requestType === '陪诊') return '陪诊类';

  // 基于描述关键词判断
  for (const kw of keywords.health) {
    if (desc.includes(kw)) return '健康类';
  }
  for (const kw of keywords.maintenance) {
    if (desc.includes(kw)) return '维修类';
  }
  for (const kw of keywords.life) {
    if (desc.includes(kw)) return '生活服务类';
  }
  for (const kw of keywords.companion) {
    if (desc.includes(kw)) return '陪诊类';
  }

  // 默认：正常报平安
  if (status === '正常' && record.deviceAlert === '无') {
    return '无异常';
  }

  return '其他';
}

/**
 * 计算风险等级
 * @param {Object} record 求助记录
 * @returns {string} 低风险 / 中风险 / 高风险
 */
function calculateRiskLevel(record) {
  const status = record.status || '';
  const deviceAlert = record.deviceAlert || '';
  const desc = (record.description || '');
  const keywords = getMergedRiskKeywords();

  // 高风险判断
  if (status === '紧急求助') return '高风险';
  if (deviceAlert === '跌倒提醒' || deviceAlert === '烟感提醒') return '高风险';

  for (const kw of keywords.high) {
    if (desc.includes(kw)) return '高风险';
  }

  // 中风险判断
  if (status === '轻微不适') return '中风险';
  if (deviceAlert === '长时间未活动') return '中风险';

  for (const kw of keywords.medium) {
    if (desc.includes(kw)) return '中风险';
  }

  // 低风险
  return '低风险';
}

/**
 * 生成触发原因列表
 * @param {Object} record 求助记录
 * @param {string} riskLevel 风险等级
 * @param {string} eventType 事件类型
 * @returns {string[]} 触发原因列表
 */
function generateReasons(record, riskLevel, eventType) {
  const reasons = [];
  const status = record.status || '';
  const deviceAlert = record.deviceAlert || '';
  const desc = (record.description || '');
  const requestType = record.requestType || '';

  // 状态相关
  if (status === '紧急求助') {
    reasons.push('今日状态为"紧急求助"');
  } else if (status === '轻微不适') {
    reasons.push('今日状态为"轻微不适"');
  }

  // 设备提醒相关
  if (deviceAlert !== '无' && deviceAlert !== '') {
    reasons.push('设备触发"' + deviceAlert + '"');
  }

  // 求助类型相关
  if (requestType !== '无' && requestType !== '') {
    reasons.push('求助类型为"' + requestType + '"');
  }

  // 描述关键词（默认为先，后跟自定义）
  var keywords = getMergedRiskKeywords();
  var allKeywords = (keywords.high || []).concat(keywords.medium || []);
  var foundKeywords = [];
  var foundCustomKeywords = [];
  for (var ki = 0; ki < allKeywords.length; ki++) {
    var kw = allKeywords[ki];
    if (desc.indexOf(kw) !== -1 && foundKeywords.indexOf(kw) === -1) {
      foundKeywords.push(kw);
      if (isCustomKeyword(kw, 'high') || isCustomKeyword(kw, 'medium')) {
        foundCustomKeywords.push(kw);
      }
    }
  }
  if (foundKeywords.length > 0) {
    reasons.push('描述包含"' + foundKeywords.join('、') + '"');
  }
  // 自定义关键词单独标注
  if (foundCustomKeywords.length > 0) {
    reasons.push('命中自定义规则关键词：' + foundCustomKeywords.join('、'));
  }

  // 服务等级相关
  if (record.serviceLevel === '重点关注') {
    reasons.push('老人属于重点关注对象');
  }

  if (reasons.length === 0) {
    reasons.push('无明显风险触发因素');
  }

  return reasons;
}

/**
 * 计算 AI 置信度
 * @param {Object} record 求助记录
 * @param {string[]} reasons 触发原因
 * @param {string} riskLevel 风险等级
 * @returns {number} 0.60 ~ 0.98
 */
function calculateConfidence(record, reasons, riskLevel) {
  let confidence = 0.65;
  const desc = (record.description || '');
  const deviceAlert = record.deviceAlert || '';

  // 触发原因越多，置信度越高
  const triggerCount = reasons.filter(r => !r.includes('无明显')).length;
  confidence += triggerCount * 0.05;

  // 设备提醒与文本一致时提高
  if (deviceAlert === '跌倒提醒' && (desc.includes('跌倒') || desc.includes('摔倒'))) {
    confidence += 0.08;
  }
  if (deviceAlert === '烟感提醒' && (desc.includes('烟') || desc.includes('火'))) {
    confidence += 0.08;
  }
  if (deviceAlert === '水浸提醒' && (desc.includes('漏水') || desc.includes('水'))) {
    confidence += 0.06;
  }
  if (deviceAlert === '长时间未活动' && (desc.includes('未报平安') || desc.includes('两天'))) {
    confidence += 0.06;
  }

  // 高风险级别额外加分
  if (riskLevel === '高风险') {
    confidence += 0.05;
  }

  // 描述过短降低置信度
  if (desc.length < 5) {
    confidence -= 0.1;
  }

  // 限制在 0.60 ~ 0.98
  return Math.min(0.98, Math.max(0.60, Math.round(confidence * 100) / 100));
}

/**
 * 根据风险等级和事件类型生成建议处置
 * @param {string} riskLevel 风险等级
 * @param {string} eventType 事件类型
 * @returns {string} 建议处置文本
 */
function generateSuggestion(riskLevel, eventType, record) {
  var suggestion = '';
  if (riskLevel === '高风险') {
    suggestion = '立即派单，通知家属和社区医生，网格员同步上门核实。';
  } else if (riskLevel === '中风险') {
    suggestion = '网格员电话核实，生成随访任务，必要时协调社区医生随访。';
  } else if (eventType === '维修类') {
    suggestion = '生成维修工单，通知物业/维修人员上门处理。';
  } else if (eventType === '生活服务类') {
    suggestion = '生成服务工单，协调志愿者或网格员提供帮助。';
  } else if (eventType === '陪诊类') {
    suggestion = '确认就医需求，协调志愿者陪同，通知家属确认。';
  } else {
    suggestion = '进入常规巡访计划，系统留痕。';
  }
  // 是否需要回访
  if (record && record.needFollowUp === '是') {
    suggestion += '建议安排后续回访。';
  }
  return suggestion;
}

/**
 * 根据事件类型和风险等级推荐责任人
 * @param {string} eventType 事件类型
 * @param {string} riskLevel 风险等级
 * @returns {Object} { assignee, deadline }
 */
function recommendAssignee(eventType, riskLevel) {
  if (eventType === '健康类' && riskLevel === '高风险') {
    return { assignee: '社区医生 + 网格员', deadline: '30 分钟内响应' };
  }
  if (eventType === '健康类' && riskLevel === '中风险') {
    return { assignee: '网格员（电话核实），必要时社区医生随访', deadline: '2 小时内响应' };
  }
  if (eventType === '维修类') {
    return { assignee: '物业/维修人员', deadline: '4 小时内响应' };
  }
  if (eventType === '生活服务类') {
    return { assignee: '志愿者或网格员', deadline: '当日响应' };
  }
  if (eventType === '陪诊类') {
    return { assignee: '志愿者 + 家属确认', deadline: '1 日内安排' };
  }
  if (eventType === '健康类' && riskLevel === '低风险') {
    return { assignee: '系统留痕，纳入常规巡访', deadline: '按巡访计划处理' };
  }
  return { assignee: '网格员', deadline: '按常规流程处理' };
}

/**
 * 生成管理复盘建议
 * @param {Object[]} orderList 工单列表
 * @param {Object[]} recordList 记录列表
 * @returns {string[]} 建议列表
 */
function generateReviewAdvice(orderList, recordList) {
  const suggestions = [];

  // 高风险未完成工单
  const highRiskUnfinished = orderList.filter(function(o) {
    return o.riskLevel === '高风险' && o.status !== '已完成' && o.status !== '已关闭';
  });
  if (highRiskUnfinished.length > 0) {
    suggestions.push('存在高风险未完成工单，建议优先跟进（共 ' + highRiskUnfinished.length + ' 个）。');
  }

  // 超时未闭环工单检测
  var now = getNow ? getNow() : '';
  if (now) {
    var overdueOrders = orderList.filter(function(o) {
      if (o.status === '已完成' || o.status === '已关闭') return false;
      // 检查处理时限
      if (o.deadline) {
        var dl = o.deadline;
        // 简单判断：如果 deadline 是分钟数（如 "30 分钟内响应"）
        var minMatch = dl.match(/(\d+)\s*分钟/);
        if (minMatch) {
          var limitMinutes = parseInt(minMatch[1]);
          if (o.createdAt) {
            var created = new Date(o.createdAt);
            if (!isNaN(created.getTime())) {
              var elapsed = (new Date() - created) / 60000; // 已过分钟数
              if (elapsed > limitMinutes) return true;
            }
          }
        }
        // 如果 deadline 是小时数
        var hourMatch = dl.match(/(\d+)\s*小时/);
        if (hourMatch) {
          var limitHours = parseInt(hourMatch[1]);
          if (o.createdAt) {
            var created2 = new Date(o.createdAt);
            if (!isNaN(created2.getTime())) {
              var elapsed2 = (new Date() - created2) / 3600000; // 已过小时数
              if (elapsed2 > limitHours) return true;
            }
          }
        }
      }
      return false;
    });
    if (overdueOrders.length > 0) {
      suggestions.push('存在超时未闭环工单，请优先跟进（共 ' + overdueOrders.length + ' 个）。');
    }
  }

  // 高风险闭环完成率
  var highRiskOrders = orderList.filter(function(o) { return o.riskLevel === '高风险'; });
  if (highRiskOrders.length > 0) {
    var highRiskClosed = highRiskOrders.filter(function(o) { return o.status === '已完成' || o.status === '已关闭'; });
    var highRiskRate = Math.round((highRiskClosed.length / highRiskOrders.length) * 100);
    if (highRiskRate < 80) {
      suggestions.push('高风险处置闭环率偏低（' + highRiskRate + '%），建议复盘响应机制。');
    }
  }

  // 高风险统计
  const highRiskCount = orderList.filter(o => o.riskLevel === '高风险').length;
  if (highRiskCount > 3) {
    suggestions.push('高风险事件较多，建议增加网格员巡访频率，排查重点老人安全隐患。');
  }

  // AI 被修改统计（优先基于 isAiModified 字段）
  var aiModifiedCount = recordList.filter(function(r) {
    if (!r.aiResult || !r.reviewed) return false;
    if (r.hasOwnProperty('isAiModified')) return r.isAiModified === true;
    return r.aiResult.riskLevel !== r.reviewRiskLevel || r.aiResult.eventType !== r.reviewEventType;
  }).length;
  if (aiModifiedCount > 0) {
    suggestions.push('存在人工修改 AI 判断，建议复盘风险识别规则（共修改 ' + aiModifiedCount + ' 次）。');
  }

  // 不满意评价
  var unsatisfiedCount = orderList.filter(function(o) {
    return o.rating === '不满意';
  }).length;
  if (unsatisfiedCount > 0) {
    suggestions.push('存在不满意评价，建议开展回访和服务质量复盘（共 ' + unsatisfiedCount + ' 条）。');
  }

  // 维修类统计
  const maintenanceCount = orderList.filter(o => o.eventType === '维修类').length;
  if (maintenanceCount > 2) {
    suggestions.push('维修类工单集中，建议与物业部门确认响应时限和服务质量。');
  }

  // 未报平安统计
  const noReportCount = recordList.filter(r => {
    const desc = (r.description || '');
    return desc.includes('未报平安') || desc.includes('两天');
  }).length;
  if (noReportCount > 1) {
    suggestions.push('多个老人连续未报平安，建议建立重点关注名单并增加联络频率。');
  }

  // 工单完成率
  const totalOrders = orderList.length;
  const completedOrders = orderList.filter(o => o.status === '已完成' || o.status === '已关闭').length;
  if (totalOrders > 0) {
    const rate = Math.round((completedOrders / totalOrders) * 100);
    if (rate < 70) {
      suggestions.push('工单完成率偏低（' + rate + '%），建议排查工单流转堵点并优化派单流程。');
    } else {
      suggestions.push('工单完成率良好（' + rate + '%），继续保持当前服务水平。');
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('当前数据量较少，建议积累更多运行数据后再进行深度分析。');
  }

  return suggestions;
}

/* ============================
   DeepSeek 大语言模型 API 集成
   ============================ */

/**
 * 本地代理服务地址
 * API Key 仅存放在 server/.env，前端不持有
 */
var LLM_PROXY_URL = "http://localhost:3001";

/**
 * 脱敏处理 — 移除敏感字段后再发送给 LLM
 * @param {Object} record 原始求助记录
 * @returns {Object} 脱敏后的记录
 */
function sanitizeRecordForLLM(record) {
  // 浅拷贝，避免修改原始对象
  var sanitized = {};

  // 姓名固定替换
  sanitized.elderName = "老人A";

  // 年龄保留（非敏感）
  sanitized.age = record.age;

  // 地址脱敏：只保留社区级信息
  if (record.address) {
    // 尝试提取 "XX社区" 部分，丢弃楼栋号
    var communityMatch = record.address.match(/^([一-龥]+社区)/);
    if (communityMatch) {
      sanitized.address = communityMatch[1];
    } else {
      // 退而求其次：取第一个空格前的内容
      var firstSpace = record.address.indexOf(" ");
      if (firstSpace > 0) {
        sanitized.address = record.address.substring(0, firstSpace);
      } else {
        sanitized.address = "幸福社区";
      }
    }
  }

  // 描述保留，但移除手机号
  if (record.description) {
    sanitized.description = record.description.replace(/1[3-9]\d{9}/g, "[手机号已脱敏]");
  } else {
    sanitized.description = "";
  }

  // 保留以下字段
  sanitized.status = record.status || "";
  sanitized.requestType = record.requestType || "";
  sanitized.deviceAlert = record.deviceAlert || "";
  sanitized.healthTags = record.healthTags || [];
  sanitized.serviceLevel = record.serviceLevel || "";
  sanitized.lastStatus = record.lastStatus || "";
  sanitized.needFollowUp = record.needFollowUp || "";
  sanitized.expectedAction = record.expectedAction || "";
  // 不发送 phone；不发送 emergencyContact
  sanitized.privacyNotice = "已脱敏，不包含完整姓名、电话、门牌号和紧急联系人信息";

  return sanitized;
}

/**
 * 调用 DeepSeek 本地代理服务进行风险识别
 * @param {Object} record 原始求助记录
 * @returns {Promise<Object|null>} 成功返回 aiResult，失败返回 null
 */
async function analyzeRequestWithLLM(record) {
  var sanitized = sanitizeRecordForLLM(record);

  // 超时控制：12 秒
  var controller = new AbortController();
  var timeoutId = setTimeout(function() {
    controller.abort();
  }, 12000);

  try {
    var response = await fetch(LLM_PROXY_URL + "/api/analyze-care-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: sanitized }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("[LLM] 代理服务返回 HTTP " + response.status);
      return null;
    }

    var data = await response.json();

    if (!data || data.ok !== true || !data.aiResult) {
      console.warn("[LLM] 代理服务返回异常: " + (data && data.message ? data.message : "无 aiResult"));
      return null;
    }

    return data.aiResult;
  } catch (err) {
    clearTimeout(timeoutId);
    // AbortError 表示超时；网络错误同样返回 null
    if (err.name === "AbortError") {
      console.warn("[LLM] 请求超时（12 秒）");
    } else {
      console.warn("[LLM] 请求失败: " + (err.message || err));
    }
    return null;
  }
}

/**
 * 使用本地规则引擎兜底，构造与 LLM 返回格式一致的 aiResult
 * @param {Object} record 原始求助记录
 * @param {string} reason 兜底原因
 * @returns {Object} aiResult
 */
function buildFallbackAIResult(record, reason) {
  // 调用现有规则引擎
  var ruleResult = analyzeRequest(record);
  // 补充推荐责任人和时限
  var recommend = recommendAssignee(ruleResult.eventType, ruleResult.riskLevel);

  return {
    riskLevel: ruleResult.riskLevel,
    eventType: ruleResult.eventType,
    confidence: ruleResult.confidence,
    reasons: ruleResult.reasons,
    suggestion: ruleResult.suggestion,
    assignee: recommend.assignee,
    deadline: recommend.deadline,
    modelProvider: "本地规则引擎",
    modelName: "rule-based-fallback",
    aiModeUsed: "fallback",
    fallback: true,
    fallbackReason: reason || "DeepSeek 大语言模型调用失败",
    privacyProtected: false
  };
}

/**
 * 统一 AI 分析入口 — 前端所有调用都走这个函数
 * 优先使用 DeepSeek LLM，失败时自动降级为规则引擎
 * @param {Object} record 原始求助记录
 * @returns {Promise<Object>} aiResult
 */
async function analyzeRequestDefault(record) {
  // 1. 尝试调用 DeepSeek LLM
  var llmResult = await analyzeRequestWithLLM(record);

  if (llmResult) {
    // LLM 成功，补充元信息
    llmResult.modelProvider = "DeepSeek";
    llmResult.modelName = "deepseek-chat";
    llmResult.aiModeUsed = "llm";
    llmResult.fallback = false;
    llmResult.privacyProtected = true;
    return llmResult;
  }

  // 2. LLM 失败，使用规则引擎兜底
  return buildFallbackAIResult(record, "DeepSeek 大语言模型调用失败，建议使用规则引擎兜底");
}
