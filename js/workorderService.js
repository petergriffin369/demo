/**
 * workorderService.js - 工单服务模块
 * 功能：工单创建、状态流转、派单、完成、评价
 */

/**
 * 创建工单
 * @param {Object} record 求助记录（含 AI 结果和复核信息）
 * @param {Object} reviewInfo 复核信息 { riskLevel, eventType, comment }
 * @returns {Object} 工单对象
 */
function createWorkOrder(record, reviewInfo) {
  const now = getNow();
  const recommend = recommendAssignee(reviewInfo.eventType, reviewInfo.riskLevel);

  const order = {
    id: 'WO' + Date.now(),
    recordId: record.id,
    elderId: record.elderId,
    elderName: record.elderName,
    address: record.address,
    riskLevel: reviewInfo.riskLevel,
    eventType: reviewInfo.eventType,
    aiReasons: record.aiResult ? record.aiResult.reasons : [],
    aiRiskLevel: record.aiResult ? record.aiResult.riskLevel : '',
    aiEventType: record.aiResult ? record.aiResult.eventType : '',
    reviewRiskLevel: reviewInfo.riskLevel,
    reviewEventType: reviewInfo.eventType,
    reviewComment: reviewInfo.comment || '',
    assignee: recommend.assignee,
    originalAssignee: recommend.assignee,
    deadline: recommend.deadline,
    status: '待派单',
    result: '',
    rating: '',
    ratingComment: '',
    processRole: '',
    acceptedAt: '',
    completedAt: '',
    photoUploaded: false,
    reassignHistory: [],
    createdAt: now,
    updatedAt: now
  };

  return order;
}

/**
 * 更新工单状态
 * @param {Object} order 工单对象
 * @param {string} status 新状态
 * @returns {Object} 更新后的工单
 */
function updateWorkOrderStatus(order, status) {
  const validStatuses = ['待派单', '已派单', '处理中', '已完成', '已关闭'];
  if (!validStatuses.includes(status)) {
    console.error('无效的工单状态:', status);
    return order;
  }
  order.status = status;
  order.updatedAt = getNow();
  return order;
}

/**
 * 派单/改派工单
 * @param {Object} order 工单对象
 * @param {string} assignee 新的责任人
 * @param {string} reason 改派原因
 * @returns {Object} 更新后的工单
 */
function assignWorkOrder(order, assignee, reason) {
  if (order.assignee !== assignee) {
    order.reassignHistory.push({
      from: order.assignee,
      to: assignee,
      reason: reason || '',
      time: getNow()
    });
    order.assignee = assignee;
  }
  if (order.status === '待派单') {
    order.status = '已派单';
  }
  order.updatedAt = getNow();
  return order;
}

/**
 * 完成工单
 * @param {Object} order 工单对象
 * @param {string} result 处理结果
 * @param {string} rating 家属评价（满意/一般/不满意）
 * @param {string} ratingComment 评价备注
 * @returns {Object} 更新后的工单
 */
function completeWorkOrder(order, result, rating, ratingComment, photoUploaded) {
  order.result = result;
  order.rating = rating;
  order.ratingComment = ratingComment || '';
  order.status = '已完成';
  order.completedAt = getNow();
  order.photoUploaded = photoUploaded || false;
  order.updatedAt = getNow();
  return order;
}

/**
 * 按状态筛选工单
 * @param {Object[]} orders 工单列表
 * @param {string} status 状态
 * @returns {Object[]} 筛选结果
 */
function getWorkOrdersByStatus(orders, status) {
  if (!status || status === '全部') return orders;
  return orders.filter(o => o.status === status);
}

/**
 * 按风险等级筛选工单
 * @param {Object[]} orders 工单列表
 * @param {string} riskLevel 风险等级
 * @returns {Object[]} 筛选结果
 */
function getWorkOrdersByRisk(orders, riskLevel) {
  if (!riskLevel || riskLevel === '全部') return orders;
  return orders.filter(o => o.riskLevel === riskLevel);
}

/**
 * 获取当前时间字符串
 * @returns {string} 格式化的时间
 */
function getNow() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
