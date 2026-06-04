/**
 * aiEngine.js - 嵌入式 AI 模拟引擎
 * 功能：文本分类、风险评分、触发原因生成、派单推荐
 * 基于规则引擎模拟，不调用外部 API
 */

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
  const suggestion = generateSuggestion(riskLevel, eventType);

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

  // 求助类型直接映射
  if (requestType === '健康') return '健康类';
  if (requestType === '维修') return '维修类';
  if (requestType === '生活') return '生活服务类';
  if (requestType === '陪诊') return '陪诊类';

  // 基于描述关键词判断
  for (const kw of RISK_KEYWORDS.health) {
    if (desc.includes(kw)) return '健康类';
  }
  for (const kw of RISK_KEYWORDS.maintenance) {
    if (desc.includes(kw)) return '维修类';
  }
  for (const kw of RISK_KEYWORDS.life) {
    if (desc.includes(kw)) return '生活服务类';
  }
  for (const kw of RISK_KEYWORDS.companion) {
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
  const requestType = record.requestType || '';

  // 高风险判断
  if (status === '紧急求助') return '高风险';
  if (deviceAlert === '跌倒提醒' || deviceAlert === '烟感提醒') return '高风险';

  for (const kw of RISK_KEYWORDS.high) {
    if (desc.includes(kw)) return '高风险';
  }

  // 中风险判断
  if (status === '轻微不适') return '中风险';
  if (deviceAlert === '长时间未活动') return '中风险';

  for (const kw of RISK_KEYWORDS.medium) {
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

  // 描述关键词
  const allKeywords = [...RISK_KEYWORDS.high, ...RISK_KEYWORDS.medium];
  const foundKeywords = [];
  for (const kw of allKeywords) {
    if (desc.includes(kw) && !foundKeywords.includes(kw)) {
      foundKeywords.push(kw);
    }
  }
  if (foundKeywords.length > 0) {
    reasons.push('描述包含"' + foundKeywords.join('、') + '"');
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
function generateSuggestion(riskLevel, eventType) {
  if (riskLevel === '高风险') {
    return '立即派单，通知家属和社区医生，网格员同步上门核实。';
  }
  if (riskLevel === '中风险') {
    return '网格员电话核实，生成随访任务，必要时协调社区医生随访。';
  }
  if (eventType === '维修类') {
    return '生成维修工单，通知物业/维修人员上门处理。';
  }
  if (eventType === '生活服务类') {
    return '生成服务工单，协调志愿者或网格员提供帮助。';
  }
  if (eventType === '陪诊类') {
    return '确认就医需求，协调志愿者陪同，通知家属确认。';
  }
  return '进入常规巡访计划，系统留痕。';
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
