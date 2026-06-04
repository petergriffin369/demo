/**
 * dashboardService.js - 管理驾驶舱统计计算模块
 * 功能：各项统计指标计算、风险分布、工单状态分布、复盘建议
 */

/**
 * 计算管理驾驶舱全部指标
 * @param {Object} state 全局状态
 * @returns {Object} 指标数据
 */
function calculateDashboardMetrics(state) {
  const records = state.careRecords || [];
  const orders = state.workOrders || [];

  const today = getTodayStr();
  const todayRecords = records.filter(r => r.createdAt && r.createdAt.startsWith(today));
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(today));

  const highRiskOrders = orders.filter(o => o.riskLevel === '高风险');
  const pendingOrders = orders.filter(o => o.status === '待派单' || o.status === '已派单');
  const completedOrders = orders.filter(o => o.status === '已完成' || o.status === '已关闭');

  // AI 修改次数（优先基于 isAiModified 字段）
  const aiModifiedCount = records.filter(r => {
    if (!r.aiResult || !r.reviewed) return false;
    if (r.hasOwnProperty('isAiModified')) return r.isAiModified === true;
    return r.aiResult.riskLevel !== r.reviewRiskLevel || r.aiResult.eventType !== r.reviewEventType;
  }).length;

  // 平均响应时长（模拟）
  const avgResponse = state.resources && state.resources.length > 0
    ? Math.round(state.resources.reduce((s, r) => s + (r.avgResponseMinutes || 30), 0) / state.resources.length)
    : 30;

  return {
    todayRecordCount: todayRecords.length,
    totalRecordCount: records.length,
    todayRiskCount: todayRecords.filter(r => r.aiResult && r.aiResult.riskLevel !== '低风险').length,
    highRiskCount: highRiskOrders.length,
    pendingOrderCount: pendingOrders.length,
    completedOrderCount: completedOrders.length,
    totalOrderCount: orders.length,
    completionRate: calculateCompletionRate(orders),
    avgResponseMinutes: avgResponse,
    aiModifiedCount: aiModifiedCount,
    riskDistribution: calculateRiskDistribution(records),
    workOrderDistribution: calculateWorkOrderDistribution(orders),
    suggestions: generateManagementSuggestions(state)
  };
}

/**
 * 计算风险分布
 * @param {Object[]} records 求助记录列表
 * @returns {Object} { 低风险: n, 中风险: n, 高风险: n }
 */
function calculateRiskDistribution(records) {
  const dist = { '低风险': 0, '中风险': 0, '高风险': 0 };
  records.forEach(r => {
    if (r.aiResult && r.aiResult.riskLevel) {
      const level = r.aiResult.riskLevel;
      if (dist.hasOwnProperty(level)) {
        dist[level]++;
      }
    }
  });
  return dist;
}

/**
 * 计算工单状态分布
 * @param {Object[]} orders 工单列表
 * @returns {Object} { 待派单: n, 已派单: n, 处理中: n, 已完成: n, 已关闭: n }
 */
function calculateWorkOrderDistribution(orders) {
  const dist = { '待派单': 0, '已派单': 0, '处理中': 0, '已完成': 0, '已关闭': 0 };
  orders.forEach(o => {
    if (dist.hasOwnProperty(o.status)) {
      dist[o.status]++;
    }
  });
  return dist;
}

/**
 * 计算工单完成率
 * @param {Object[]} orders 工单列表
 * @returns {string} 百分比字符串
 */
function calculateCompletionRate(orders) {
  if (orders.length === 0) return '0%';
  const done = orders.filter(o => o.status === '已完成' || o.status === '已关闭').length;
  return Math.round((done / orders.length) * 100) + '%';
}

/**
 * 生成管理复盘建议
 * @param {Object} state 全局状态
 * @returns {string[]} 建议列表
 */
function generateManagementSuggestions(state) {
  return generateReviewAdvice(state.workOrders || [], state.careRecords || []);
}

/**
 * 获取今日日期字符串
 * @returns {string} YYYY-MM-DD
 */
function getTodayStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
