/**
 * ui.js - DOM 渲染和页面切换模块
 * 负责所有页面的渲染、导航切换和 Toast 提示
 */

/* ============================
   XSS 防护：HTML 转义函数
   ============================ */

/**
 * 对用户输入内容进行 HTML 转义，防止 XSS 攻击
 * @param {string} text 原始文本
 * @returns {string} 转义后的安全文本
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================
   页面切换
   ============================ */

/**
 * 切换到指定页面（section）
 * @param {string} sectionId section 元素的 id
 */
function showSection(sectionId) {
  // 隐藏所有 section
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  // 显示目标
  var target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
  }
  // 更新导航激活状态
  document.querySelectorAll('.header-nav a').forEach(function(a) { a.classList.remove('active'); });
  var navLink = document.querySelector('.header-nav a[data-section="' + sectionId + '"]');
  if (navLink) {
    navLink.classList.add('active');
  }
  // 滚动到顶部
  window.scrollTo(0, 0);
}

/* ============================
   Toast 消息提示
   ============================ */

/**
 * 显示 Toast 提示消息
 * @param {string} message 消息内容
 * @param {string} type 类型：success / error / info / warning
 */
function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() {
      container.removeChild(toast);
    }, 300);
  }, 2500);
}

/* ============================
   辅助函数
   ============================ */

function riskTag(level) {
  if (level === '高风险') return '<span class="tag tag-high">高风险</span>';
  if (level === '中风险') return '<span class="tag tag-mid">中风险</span>';
  if (level === '低风险') return '<span class="tag tag-low">低风险</span>';
  return '<span class="tag tag-gray">' + escapeHtml(level) + '</span>';
}

function statusTag(status) {
  var map = {
    '待派单': 'status-pending',
    '已派单': 'status-assigned',
    '处理中': 'status-processing',
    '已完成': 'status-done',
    '已关闭': 'status-closed'
  };
  var cls = map[status] || 'tag-gray';
  return '<span class="tag-status ' + cls + '">' + escapeHtml(status) + '</span>';
}

function emptyRow(colspan) {
  return '<tr><td colspan="' + colspan + '" class="empty-state">暂无数据</td></tr>';
}

function getStateSafe() {
  return window.appState || { elders: [], resources: [], careRecords: [], workOrders: [] };
}

/* ============================
   模块 1：首页概览
   ============================ */

function renderHome() {
  var container = document.getElementById('homeSection');
  if (!container) return;
  var state = getStateSafe();
  var records = state.careRecords || [];
  var orders = state.workOrders || [];
  var today = getTodayStr();

  // 计算关键指标
  var todayRecords = records.filter(function(r) { return r.createdAt && r.createdAt.startsWith(today); });
  var pendingOrders = orders.filter(function(o) { return o.status === '待派单' || o.status === '已派单'; });
  var processingOrders = orders.filter(function(o) { return o.status === '处理中'; });
  var completedOrders = orders.filter(function(o) { return o.status === '已完成' || o.status === '已关闭'; });
  var highRiskUnfinished = orders.filter(function(o) { return o.riskLevel === '高风险' && o.status !== '已完成' && o.status !== '已关闭'; });
  var todayRiskCount = todayRecords.filter(function(r) { return r.aiResult && r.aiResult.riskLevel !== '低风险'; }).length;
  var unreviewedRecords = records.filter(function(r) { return !r.reviewed; });
  var pendingAssignOrders = orders.filter(function(o) { return o.status === '待派单'; });

  container.innerHTML = ''
    // 系统标题
    + '<div class="hero">'
    + '<h2>社区独居老人照护风险预警与服务调度系统</h2>'
    + '<p>面向社区网格员、社区医生、物业维修人员、志愿者和老人家属，提供照护风险预警、智能识别、工单调度与协同处理服务。</p>'
    + '</div>'

    // 关键指标卡片
    + '<div class="section-label">关键指标</div>'
    + '<div class="stat-grid">'
    + buildStatCard('老人档案数', state.elders.length, '')
    + buildStatCard('今日报平安/求助', todayRecords.length, 'stat-green')
    + buildStatCard('当前风险提醒', todayRiskCount, 'stat-orange')
    + buildStatCard('待处理工单', pendingOrders.length, 'stat-orange')
    + buildStatCard('处理中工单', processingOrders.length, '')
    + buildStatCard('已完成工单', completedOrders.length, 'stat-green')
    + buildStatCard('高风险事件', highRiskUnfinished.length, 'stat-red')
    + '</div>'

    // 核心业务流程
    + '<div class="section-label">核心业务流程</div>'
    + '<div class="flow-cards">'
    + buildFlowCard('1', '信息采集', '报平安、求助、巡访、设备提醒', 'elderFormSection')
    + buildFlowCard('2', 'AI 风险识别', '分类诉求、判断风险、生成原因', 'aiResultSection')
    + buildFlowCard('3', '人工复核', '网格员确认风险和处置方式', 'reviewSection')
    + buildFlowCard('4', '工单调度', '按事件类型推荐责任人并派单', 'workOrderSection')
    + buildFlowCard('5', '协同处理', '医生、物业、志愿者、网格员协同', 'collaborationSection')
    + buildFlowCard('6', '服务复盘', '结果记录、家属评价、管理看板', 'dashboardSection')
    + '</div>'

    // 待处理事项 + 快捷操作
    + '<div class="grid-2">'
    + buildPendingList(unreviewedRecords, pendingAssignOrders, processingOrders, highRiskUnfinished)
    + buildQuickActions()
    + '</div>';
}

function buildFlowCard(num, title, desc, sectionId) {
  return ''
    + '<div class="flow-card" onclick="showSection(\'' + sectionId + '\')" style="cursor:pointer">'
    + '<div class="flow-num">' + num + '</div>'
    + '<h4>' + escapeHtml(title) + '</h4>'
    + '<p>' + escapeHtml(desc) + '</p>'
    + '</div>';
}

/**
 * 构建待处理事项列表
 */
function buildPendingList(unreviewed, pendingAssign, processing, highRiskUnfinished) {
  var html = '<div class="card"><div class="card-title">待处理事项</div>';

  var items = [
    { label: '待复核记录', count: unreviewed.length, section: 'reviewSection', style: unreviewed.length > 0 ? 'color:var(--orange);font-weight:700' : '' },
    { label: '待派单工单', count: pendingAssign.length, section: 'workOrderSection', style: pendingAssign.length > 0 ? 'color:var(--orange);font-weight:700' : '' },
    { label: '处理中工单', count: processing.length, section: 'collaborationSection', style: processing.length > 0 ? 'color:var(--primary);font-weight:700' : '' },
    { label: '高风险未完成', count: highRiskUnfinished.length, section: 'workOrderSection', style: highRiskUnfinished.length > 0 ? 'color:var(--red);font-weight:700' : '' }
  ];

  if (items.every(function(it) { return it.count === 0; })) {
    html += '<div class="empty-state">暂无待处理事项</div>';
  } else {
    html += '<ul class="pending-list">';
    items.forEach(function(item) {
      var indicator = item.count > 0 ? '<span class="pending-count" style="' + item.style + '">' + item.count + '</span>' : '<span class="pending-count" style="color:var(--gray-400)">0</span>';
      html += '<li class="pending-item" onclick="showSection(\'' + item.section + '\')">'
        + '<span class="pending-label">' + item.label + '</span>'
        + indicator
        + '</li>';
    });
    html += '</ul>';
  }

  html += '</div>';
  return html;
}

/**
 * 构建快捷操作按钮区
 */
function buildQuickActions() {
  var html = '<div class="card"><div class="card-title">快捷操作</div>'
    + '<div class="quick-actions">'
    + '<button class="btn btn-primary quick-btn" onclick="showSection(\'elderFormSection\');renderElderForm();">'
    + '<span class="quick-btn-icon">＋</span>新增报平安 / 求助</button>'
    + '<button class="btn btn-outline quick-btn" onclick="showSection(\'aiResultSection\');renderAIResult();">'
    + '<span class="quick-btn-icon">🔍</span>查看智能风险识别</button>'
    + '<button class="btn btn-outline quick-btn" onclick="showSection(\'workOrderSection\');renderWorkOrderPage();">'
    + '<span class="quick-btn-icon">📋</span>查看工单调度</button>'
    + '<button class="btn btn-outline quick-btn" onclick="showSection(\'dashboardSection\');renderDashboard();">'
    + '<span class="quick-btn-icon">📊</span>查看管理驾驶舱</button>'
    + '</div>'
    + '</div>';
  return html;
}

/* ============================
   模块 2：老人/家属端
   ============================ */

function renderElderForm() {
  var container = document.getElementById('elderFormSection');
  if (!container) return;
  var state = getStateSafe();

  var elderOptions = state.elders.map(function(e) {
    return '<option value="' + e.id + '">' + escapeHtml(e.name) + '（' + e.age + '岁，' + escapeHtml(e.address) + '）</option>';
  }).join('');

  container.innerHTML = ''
    + '<h2 class="section-title">老人/家属端：报平安 / 求助提交</h2>'
    + '<div class="card">'
    + '<div class="card-title">快速填充示例</div>'
    + '<div class="example-btns">'
    + '<button class="btn btn-outline btn-sm" onclick="fillExample(1)">示例 1：正常报平安（王奶奶）</button>'
    + '<button class="btn btn-outline btn-sm" onclick="fillExample(2)">示例 2：中风险未报平安（李爷爷）</button>'
    + '<button class="btn btn-warning btn-sm" onclick="fillExample(3)">示例 3：高风险跌倒（张阿姨）</button>'
    + '<button class="btn btn-outline btn-sm" onclick="fillExample(4)">示例 4：维修类求助（陈爷爷）</button>'
    + '</div>'
    + '</div>'
    + '<div class="card">'
    + '<div class="card-title">报平安 / 求助表单</div>'
    + '<form id="careForm" onsubmit="return false;">'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>老人姓名 <span class="required">*</span></label>'
    + '<select id="elderSelect" class="form-control" required onchange="onElderChange()">'
    + '<option value="">-- 请选择老人 --</option>' + elderOptions
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>年龄</label>'
    + '<input type="text" id="elderAge" class="form-control" readonly>'
    + '</div>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>地址</label>'
    + '<input type="text" id="elderAddress" class="form-control" readonly>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>今日状态 <span class="required">*</span></label>'
    + '<select id="statusSelect" class="form-control" required>'
    + '<option value="">-- 请选择 --</option>'
    + '<option value="正常">正常</option>'
    + '<option value="轻微不适">轻微不适</option>'
    + '<option value="紧急求助">紧急求助</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>求助类型</label>'
    + '<select id="requestTypeSelect" class="form-control">'
    + '<option value="无">无</option>'
    + '<option value="健康">健康</option>'
    + '<option value="生活">生活</option>'
    + '<option value="维修">维修</option>'
    + '<option value="陪诊">陪诊</option>'
    + '<option value="其他">其他</option>'
    + '</select>'
    + '</div>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>设备提醒</label>'
    + '<select id="deviceAlertSelect" class="form-control">'
    + '<option value="无">无</option>'
    + '<option value="跌倒提醒">跌倒提醒</option>'
    + '<option value="烟感提醒">烟感提醒</option>'
    + '<option value="水浸提醒">水浸提醒</option>'
    + '<option value="长时间未活动">长时间未活动</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>提交人角色</label>'
    + '<select id="reporterRoleSelect" class="form-control">'
    + '<option value="老人本人">老人本人</option>'
    + '<option value="家属">家属</option>'
    + '<option value="网格员代填">网格员代填</option>'
    + '</select>'
    + '</div>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>描述</label>'
    + '<textarea id="descText" class="form-control" placeholder="请描述老人当前情况..."></textarea>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>联系电话</label>'
    + '<input type="text" id="phoneInput" class="form-control" placeholder="请输入联系电话">'
    + '</div>'
    + '<button type="button" class="btn btn-primary" onclick="submitCareRecord()">提交求助</button>'
    + '</form>'
    + '</div>';
}

/**
 * 老人选择变化时自动填充年龄和地址
 */
function onElderChange() {
  var state = getStateSafe();
  var elderId = document.getElementById('elderSelect').value;
  var elder = state.elders.find(function(e) { return e.id === elderId; });
  if (elder) {
    document.getElementById('elderAge').value = elder.age;
    document.getElementById('elderAddress').value = elder.address;
  } else {
    document.getElementById('elderAge').value = '';
    document.getElementById('elderAddress').value = '';
  }
}

/* ============================
   模块 3：智能风险识别
   ============================ */

function renderAIResult() {
  var container = document.getElementById('aiResultSection');
  if (!container) return;
  var state = getStateSafe();
  var records = state.careRecords || [];
  var latestRecord = records.length > 0 ? records[records.length - 1] : null;

  var html = '<h2 class="section-title">智能风险识别：AI 辅助分析</h2>';

  if (!latestRecord || !latestRecord.aiResult) {
    html += '<div class="card"><div class="empty-state">暂无求助记录，请先在"老人/家属端"提交报平安或求助信息。</div></div>';
  } else {
    html += buildRecordSummaryCard(latestRecord);
    html += buildAIResultCard(latestRecord);
    html += '<div class="alert alert-warning">AI 结果仅作辅助，必须由网格员人工复核后生成工单。</div>';
    html += '<div class="btn-group">';
    html += '<button class="btn btn-primary" onclick="goToReview()">进入人工复核</button>';
    html += '<button class="btn btn-outline" onclick="showSection(\'dataSection\');renderDataTables();">查看数据记录</button>';
    html += '</div>';
  }

  container.innerHTML = html;
}

function buildRecordSummaryCard(record) {
  return ''
    + '<div class="card">'
    + '<div class="card-title">求助记录摘要</div>'
    + '<div class="detail-grid">'
    + '<div class="detail-item"><div class="detail-label">老人姓名</div><div class="detail-value">' + escapeHtml(record.elderName) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">今日状态</div><div class="detail-value">' + escapeHtml(record.status) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">求助类型</div><div class="detail-value">' + escapeHtml(record.requestType || '无') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">设备提醒</div><div class="detail-value">' + escapeHtml(record.deviceAlert || '无') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">提交人</div><div class="detail-value">' + escapeHtml(record.reporterRole || '') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">提交时间</div><div class="detail-value">' + escapeHtml(record.createdAt || '') + '</div></div>'
    + '<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">描述</div><div class="detail-value">' + escapeHtml(record.description || '无') + '</div></div>'
    + '</div>'
    + '</div>';
}

function buildAIResultCard(record) {
  var ai = record.aiResult;
  if (!ai) return '';

  var confPercent = Math.round(ai.confidence * 100) + '%';

  // 获取推荐责任主体和处理时限
  var recommend = recommendAssignee(ai.eventType, ai.riskLevel);

  // 生成可解释规则说明
  var explainableRules = buildExplainableRules(record, ai);

  var html = ''
    + '<div class="card ai-result-card">'
    + '<div class="ai-result-header">'
    + '<h4>AI 识别结果</h4>'
    + '<div class="ai-confidence">置信度：' + confPercent + '</div>'
    + '</div>'
    + '<div class="detail-grid">'
    + '<div class="detail-item"><div class="detail-label">风险等级</div><div class="detail-value">' + riskTag(ai.riskLevel) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">事件类型</div><div class="detail-value"><span class="tag tag-info">' + escapeHtml(ai.eventType) + '</span></div></div>'
    + '<div class="detail-item"><div class="detail-label">推荐责任主体</div><div class="detail-value" style="font-weight:600">' + escapeHtml(recommend.assignee) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">推荐处理时限</div><div class="detail-value" style="font-weight:600;color:var(--primary-dark)">' + escapeHtml(recommend.deadline) + '</div></div>'
    + '<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">触发原因</div>'
    + '<ul class="ai-reasons">' + ai.reasons.map(function(r) { return '<li>' + escapeHtml(r) + '</li>'; }).join('') + '</ul></div>'
    + '<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">建议处置</div><div class="detail-value" style="font-weight:600;color:var(--primary-dark)">' + escapeHtml(ai.suggestion) + '</div></div>'
    + '</div>';

  // 可解释规则说明
  if (explainableRules.length > 0) {
    html += '<div class="explainable-rules">'
      + '<div class="explainable-rules-title">可解释规则说明</div>'
      + '<ul>' + explainableRules.map(function(r) { return '<li>' + r + '</li>'; }).join('') + '</ul>'
      + '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * 根据当前记录生成可解释规则说明
 * @param {Object} record 求助记录
 * @param {Object} ai AI 识别结果
 * @returns {string[]} 规则说明列表
 */
function buildExplainableRules(record, ai) {
  var rules = [];
  var status = record.status || '';
  var deviceAlert = record.deviceAlert || '';
  var desc = (record.description || '');
  var requestType = record.requestType || '';

  // 状态规则
  if (status === '紧急求助') {
    rules.push('状态规则：今日状态为"紧急求助"，触发高风险规则');
  } else if (status === '轻微不适') {
    rules.push('状态规则：今日状态为"轻微不适"，触发中风险规则');
  } else if (status === '正常') {
    rules.push('状态规则：今日状态为"正常"，未触发风险状态规则');
  }

  // 设备规则
  if (deviceAlert && deviceAlert !== '无') {
    var deviceRiskMap = {
      '跌倒提醒': '高风险',
      '烟感提醒': '高风险',
      '长时间未活动': '中风险',
      '水浸提醒': '低风险'
    };
    var deviceRisk = deviceRiskMap[deviceAlert] || '相关';
    rules.push('设备规则：设备提醒为"' + deviceAlert + '"，触发' + deviceRisk + '规则');
  } else {
    rules.push('设备规则：无设备告警，未触发设备风险规则');
  }

  // 文本规则
  var allKeywords = [];
  var highKeywords = RISK_KEYWORDS.high || [];
  var mediumKeywords = RISK_KEYWORDS.medium || [];
  for (var i = 0; i < highKeywords.length; i++) {
    if (desc.indexOf(highKeywords[i]) !== -1) allKeywords.push(highKeywords[i]);
  }
  for (var j = 0; j < mediumKeywords.length; j++) {
    if (desc.indexOf(mediumKeywords[j]) !== -1) allKeywords.push(mediumKeywords[j]);
  }
  if (allKeywords.length > 0) {
    rules.push('文本规则：描述包含"' + allKeywords.join('、') + '"等关键词');
  } else {
    rules.push('文本规则：描述中未匹配到风险关键词');
  }

  // 分类规则
  if (requestType && requestType !== '无') {
    var typeLabelMap = {
      '健康': '健康类',
      '维修': '维修类',
      '生活': '生活服务类',
      '陪诊': '陪诊类',
      '其他': '其他类'
    };
    rules.push('分类规则：求助类型为"' + requestType + '"，识别为' + (typeLabelMap[requestType] || requestType) + '事件');
  }

  // 置信度说明
  rules.push('综合规则：共匹配 ' + ai.reasons.filter(function(r) { return r.indexOf('无明显') === -1; }).length + ' 条触发条件，AI 置信度为 ' + Math.round(ai.confidence * 100) + '%');

  return rules;
}

/* ============================
   模块 4：网格员复核
   ============================ */

function renderReviewPage() {
  var container = document.getElementById('reviewSection');
  if (!container) return;
  var state = getStateSafe();
  var records = state.careRecords || [];
  var unreviewed = records.filter(function(r) { return !r.reviewed; });

  var html = '<h2 class="section-title">网格员复核：人工审核与纠错</h2>';

  if (unreviewed.length === 0) {
    html += '<div class="card"><div class="empty-state">暂无待复核的记录。</div>';
    html += '<div class="btn-group"><button class="btn btn-primary" onclick="showSection(\'elderFormSection\')">去提交求助</button></div></div>';
  } else {
    var record = unreviewed[unreviewed.length - 1];
    html += buildRecordSummaryCard(record);
    if (record.aiResult) {
      html += buildAIResultCard(record);
    }
    html += buildReviewForm(record);
  }

  container.innerHTML = html;
}

function buildReviewForm(record) {
  var ai = record.aiResult || {};
  var isMediumOrHigh = (ai.riskLevel === '中风险' || ai.riskLevel === '高风险');
  return ''
    + '<div class="card">'
    + '<div class="card-title">人工复核</div>'
    + '<div class="alert alert-info">请根据实际情况确认或修改 AI 的判断结果。AI 判断和人工最终判断都将被记录。</div>'
    + '<form id="reviewForm" onsubmit="return false;">'
    + '<input type="hidden" id="reviewRecordId" value="' + record.id + '">'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>复核风险等级 <span class="required">*</span></label>'
    + '<select id="reviewRiskLevel" class="form-control" required>'
    + '<option value="低风险"' + (ai.riskLevel === '低风险' ? ' selected' : '') + '>低风险</option>'
    + '<option value="中风险"' + (ai.riskLevel === '中风险' ? ' selected' : '') + '>中风险</option>'
    + '<option value="高风险"' + (ai.riskLevel === '高风险' ? ' selected' : '') + '>高风险</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>复核事件类型 <span class="required">*</span></label>'
    + '<select id="reviewEventType" class="form-control" required>'
    + buildEventTypeOptions(ai.eventType)
    + '</select>'
    + '</div>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>复核意见</label>'
    + '<textarea id="reviewComment" class="form-control" placeholder="请填写复核意见..."></textarea>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>是否生成工单 <span class="required">*</span></label>'
    + '<select id="generateOrder" class="form-control" required>'
    + '<option value="yes"' + (isMediumOrHigh ? ' selected' : '') + '>是，生成工单</option>'
    + '<option value="no"' + (!isMediumOrHigh ? ' selected' : '') + '>否，仅留痕</option>'
    + '</select>'
    + '</div>'
    + '<button type="button" class="btn btn-primary" onclick="submitReview()">确认复核并生成工单</button>'
    + '</form>'
    + '</div>';
}

function buildEventTypeOptions(selected) {
  var types = ['健康类', '维修类', '生活服务类', '陪诊类', '无异常', '其他'];
  return types.map(function(t) {
    return '<option value="' + t + '"' + (t === selected ? ' selected' : '') + '>' + t + '</option>';
  }).join('');
}

/**
 * 跳转到复核页面
 */
function goToReview() {
  showSection('reviewSection');
  renderReviewPage();
}

/* ============================
   模块 5：工单调度
   ============================ */

function renderWorkOrderPage() {
  var container = document.getElementById('workOrderSection');
  if (!container) return;
  var state = getStateSafe();
  var orders = state.workOrders || [];

  var html = '<h2 class="section-title">工单调度</h2>';

  // 筛选栏
  html += '<div class="card">'
    + '<div class="filter-bar">'
    + '<label>风险等级：</label>'
    + '<select id="woFilterRisk" onchange="renderWorkOrderList()">'
    + '<option value="全部">全部</option>'
    + '<option value="低风险">低风险</option>'
    + '<option value="中风险">中风险</option>'
    + '<option value="高风险">高风险</option>'
    + '</select>'
    + '<label>工单状态：</label>'
    + '<select id="woFilterStatus" onchange="renderWorkOrderList()">'
    + '<option value="全部">全部</option>'
    + '<option value="待派单">待派单</option>'
    + '<option value="已派单">已派单</option>'
    + '<option value="处理中">处理中</option>'
    + '<option value="已完成">已完成</option>'
    + '<option value="已关闭">已关闭</option>'
    + '</select>'
    + '</div>'
    + '<div id="workOrderList"></div>'
    + '<div id="workOrderDetail"></div>'
    + '</div>';

  container.innerHTML = html;
  renderWorkOrderList();
}

function renderWorkOrderList() {
  var state = getStateSafe();
  var orders = state.workOrders || [];
  var riskFilter = document.getElementById('woFilterRisk') ? document.getElementById('woFilterRisk').value : '全部';
  var statusFilter = document.getElementById('woFilterStatus') ? document.getElementById('woFilterStatus').value : '全部';

  var filtered = orders;
  if (riskFilter !== '全部') filtered = filtered.filter(function(o) { return o.riskLevel === riskFilter; });
  if (statusFilter !== '全部') filtered = filtered.filter(function(o) { return o.status === statusFilter; });
  // 按创建时间倒序
  filtered.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });

  var listDiv = document.getElementById('workOrderList');
  if (!listDiv) return;

  if (filtered.length === 0) {
    listDiv.innerHTML = '<div class="empty-state">暂无匹配的工单</div>';
    return;
  }

  var html = '<div class="table-wrap"><table><thead><tr>'
    + '<th>工单编号</th><th>老人姓名</th><th>风险等级</th><th>事件类型</th>'
    + '<th>责任人</th><th>状态</th><th>创建时间</th><th>操作</th>'
    + '</tr></thead><tbody>';

  filtered.forEach(function(o) {
    html += '<tr class="clickable">'
      + '<td>' + escapeHtml(o.id) + '</td>'
      + '<td>' + escapeHtml(o.elderName) + '</td>'
      + '<td>' + riskTag(o.riskLevel) + '</td>'
      + '<td>' + escapeHtml(o.eventType) + '</td>'
      + '<td>' + escapeHtml(o.assignee) + '</td>'
      + '<td>' + statusTag(o.status) + '</td>'
      + '<td>' + escapeHtml(o.createdAt) + '</td>'
      + '<td><button class="btn btn-sm btn-outline" onclick="showWorkOrderDetail(\'' + o.id + '\')">查看详情</button></td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';
  listDiv.innerHTML = html;
}

function showWorkOrderDetail(orderId) {
  var state = getStateSafe();
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;

  var detailDiv = document.getElementById('workOrderDetail');
  if (!detailDiv) return;

  var html = '<div class="card" style="margin-top:16px">'
    + '<div class="card-title">工单详情：' + escapeHtml(order.id) + '</div>'
    + '<div class="detail-grid">'
    + '<div class="detail-item"><div class="detail-label">工单编号</div><div class="detail-value">' + escapeHtml(order.id) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">关联记录编号</div><div class="detail-value">' + escapeHtml(order.recordId || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">老人姓名</div><div class="detail-value">' + escapeHtml(order.elderName) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">地址</div><div class="detail-value">' + escapeHtml(order.address) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">风险等级</div><div class="detail-value">' + riskTag(order.riskLevel) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">事件类型</div><div class="detail-value">' + escapeHtml(order.eventType) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">AI 原始风险等级</div><div class="detail-value">' + riskTag(order.aiRiskLevel || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">人工复核风险等级</div><div class="detail-value">' + riskTag(order.reviewRiskLevel || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">人工复核事件类型</div><div class="detail-value">' + escapeHtml(order.reviewEventType || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">状态</div><div class="detail-value">' + statusTag(order.status) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">责任人</div><div class="detail-value">' + escapeHtml(order.assignee) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">处理时限</div><div class="detail-value">' + escapeHtml(order.deadline) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">处理角色</div><div class="detail-value">' + escapeHtml(order.processRole || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">接单时间</div><div class="detail-value">' + escapeHtml(order.acceptedAt || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">完成时间</div><div class="detail-value">' + escapeHtml(order.completedAt || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">是否上传照片</div><div class="detail-value">' + (order.photoUploaded ? '<span style="color:var(--green);font-weight:600">是</span>' : '<span style="color:var(--gray-400)">否</span>') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">人工复核意见</div><div class="detail-value">' + escapeHtml(order.reviewComment || '无') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">处理结果</div><div class="detail-value">' + escapeHtml(order.result || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">家属评价</div><div class="detail-value">' + escapeHtml(order.rating || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">评价备注</div><div class="detail-value">' + escapeHtml(order.ratingComment || '—') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">创建时间</div><div class="detail-value">' + escapeHtml(order.createdAt) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">更新时间</div><div class="detail-value">' + escapeHtml(order.updatedAt || order.createdAt) + '</div></div>'
    + '</div>';

  // AI 触发原因列表
  if (order.aiReasons && order.aiReasons.length > 0) {
    html += '<div style="margin-top:12px"><strong>AI 触发原因：</strong><ul class="ai-reasons">';
    order.aiReasons.forEach(function(r) {
      html += '<li>' + escapeHtml(r) + '</li>';
    });
    html += '</ul></div>';
  }

  // 改派记录
  if (order.reassignHistory && order.reassignHistory.length > 0) {
    html += '<div style="margin-top:12px;padding:12px;background:var(--gray-50);border-radius:8px">'
      + '<strong>改派记录</strong>'
      + '<div class="table-wrap" style="margin-top:8px"><table><thead><tr>'
      + '<th>时间</th><th>原责任人</th><th>新责任人</th><th>改派原因</th>'
      + '</tr></thead><tbody>';
    order.reassignHistory.forEach(function(h) {
      html += '<tr>'
        + '<td>' + escapeHtml(h.time) + '</td>'
        + '<td>' + escapeHtml(h.from) + '</td>'
        + '<td>' + escapeHtml(h.to) + '</td>'
        + '<td>' + escapeHtml(h.reason) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div></div>';
  }

  // 操作按钮
  html += '<div class="btn-group">';
  if (order.status === '待派单') {
    html += '<button class="btn btn-success" onclick="confirmAssign(\'' + order.id + '\')">确认派单</button>';
  }
  if (order.status === '待派单' || order.status === '已派单') {
    html += '<button class="btn btn-outline" onclick="showReassignForm(\'' + order.id + '\')">改派责任人</button>';
  }
  html += '<button class="btn btn-outline" onclick="showSection(\'collaborationSection\');renderCollaborationPage();">去协同处理</button>';
  html += '</div>';

  html += '<div id="reassignForm' + order.id + '" style="display:none;margin-top:12px;"></div>';
  html += '</div>';

  detailDiv.innerHTML = html;
}

/* ============================
   模块 6：协同处理
   ============================ */

function renderCollaborationPage() {
  var container = document.getElementById('collaborationSection');
  if (!container) return;
  var state = getStateSafe();
  // 只显示"已派单"和"处理中"的工单，不显示"待派单"
  var orders = state.workOrders.filter(function(o) {
    return o.status === '已派单' || o.status === '处理中';
  });
  orders.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });

  var html = '<h2 class="section-title">协同处理</h2>';

  if (orders.length === 0) {
    html += '<div class="card"><div class="empty-state">暂无已派单或处理中的工单。"待派单"工单请先在"工单调度"页面确认派单。</div></div>';
  } else {
    html += '<div class="card">'
      + '<div class="card-title">选择处理角色</div>'
      + '<div class="role-selector">'
      + '<div class="role-option selected" data-role="网格员" onclick="selectRole(this)">网格员</div>'
      + '<div class="role-option" data-role="社区医生" onclick="selectRole(this)">社区医生</div>'
      + '<div class="role-option" data-role="物业/维修人员" onclick="selectRole(this)">物业/维修人员</div>'
      + '<div class="role-option" data-role="志愿者" onclick="selectRole(this)">志愿者</div>'
      + '</div>'
      + '</div>';

    html += '<div class="card"><div class="card-title">工单列表</div>'
      + '<div class="table-wrap"><table><thead><tr>'
      + '<th>工单编号</th><th>老人</th><th>风险</th><th>事件</th><th>状态</th><th>责任人</th><th>操作</th>'
      + '</tr></thead><tbody>';

    orders.forEach(function(o) {
      html += '<tr>'
        + '<td>' + escapeHtml(o.id) + '</td>'
        + '<td>' + escapeHtml(o.elderName) + '</td>'
        + '<td>' + riskTag(o.riskLevel) + '</td>'
        + '<td>' + escapeHtml(o.eventType) + '</td>'
        + '<td>' + statusTag(o.status) + '</td>'
        + '<td>' + escapeHtml(o.assignee) + '</td>'
        + '<td>' + buildCollaborationButtons(o) + '</td>'
        + '</tr>';
    });

    html += '</tbody></table></div></div>';

    // 处理弹窗区域
    html += '<div id="processDialog"></div>';
  }

  container.innerHTML = html;
}

function buildCollaborationButtons(order) {
  if (order.status === '已派单') {
    return '<button class="btn btn-sm btn-primary" onclick="acceptOrder(\'' + order.id + '\')">接单处理</button>';
  }
  if (order.status === '处理中') {
    return '<button class="btn btn-sm btn-success" onclick="showProcessForm(\'' + order.id + '\')">完成工单</button>';
  }
  return '<span style="color:var(--gray-400)">—</span>';
}

function showProcessForm(orderId) {
  var state = getStateSafe();
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;

  var dialog = document.getElementById('processDialog');
  if (!dialog) return;

  var presetResult = '';
  if (order.eventType === '健康类' && order.riskLevel === '高风险') {
    presetResult = '已电话联系家属，网格员上门核实，社区医生同步随访，老人目前意识清楚，已建议家属陪同就医。';
  } else if (order.eventType === '维修类') {
    presetResult = '物业人员已上门处理，现场拍照记录，后续观察是否复发。';
  } else if (order.eventType === '生活服务类') {
    presetResult = '志愿者已完成代购药品并联系家属确认。';
  }

  dialog.innerHTML = ''
    + '<div class="card" style="border:2px solid var(--primary)">'
    + '<div class="card-title">完成工单：' + escapeHtml(order.id) + '</div>'
    + '<div class="form-group">'
    + '<label>处理结果 <span class="required">*</span></label>'
    + '<textarea id="processResult" class="form-control" rows="3" placeholder="请描述处理过程和结果">' + escapeHtml(presetResult) + '</textarea>'
    + '</div>'
    + '<div class="form-group">'
    + '<button class="btn btn-sm btn-outline" id="fakeUploadBtn" onclick="fakeUpload()">模拟上传照片</button>'
    + '<span id="uploadStatus" style="margin-left:8px;color:var(--gray-500)"></span>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>家属评价</label>'
    + '<select id="processRating" class="form-control">'
    + '<option value="满意">满意</option>'
    + '<option value="一般">一般</option>'
    + '<option value="不满意">不满意</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>评价备注</label>'
    + '<input type="text" id="processRatingComment" class="form-control" placeholder="可选">'
    + '</div>'
    + '</div>'
    + '<div class="btn-group">'
    + '<button class="btn btn-success" onclick="finishOrder(\'' + order.id + '\')">确认完成工单</button>'
    + '<button class="btn btn-outline" onclick="document.getElementById(\'processDialog\').innerHTML=\'\'">取消</button>'
    + '</div>'
    + '</div>';
}

/* ============================
   模块 7：管理驾驶舱
   ============================ */

function renderDashboard() {
  var container = document.getElementById('dashboardSection');
  if (!container) return;
  var state = getStateSafe();
  var metrics = calculateDashboardMetrics(state);

  var html = '<h2 class="section-title">管理驾驶舱</h2>';

  // 统计卡片
  html += '<div class="stat-grid">'
    + buildStatCard('今日记录', metrics.todayRecordCount, 'stat-green')
    + buildStatCard('累计记录数', metrics.totalRecordCount, 'stat-green')
    + buildStatCard('今日风险提醒', metrics.todayRiskCount, 'stat-orange')
    + buildStatCard('高风险事件', metrics.highRiskCount, 'stat-red')
    + buildStatCard('待处理工单', metrics.pendingOrderCount, 'stat-orange')
    + buildStatCard('已完成工单', metrics.completedOrderCount, 'stat-green')
    + buildStatCard('累计工单数', metrics.totalOrderCount, '')
    + buildStatCard('工单完成率', metrics.completionRate, '')
    + buildStatCard('平均响应(分)', metrics.avgResponseMinutes, '')
    + buildStatCard('AI修改次数', metrics.aiModifiedCount, 'stat-orange')
    + '</div>';

  // 风险分布和工单状态分布
  html += '<div class="grid-2">'
    + buildDistCard('风险分布', metrics.riskDistribution)
    + buildDistCard('工单状态分布', metrics.workOrderDistribution)
    + '</div>';

  // 重点老人列表
  html += buildKeyEldersCard(state);

  // 复盘建议
  html += '<div class="card">'
    + '<div class="card-title">服务复盘建议</div>';
  if (metrics.suggestions.length === 0) {
    html += '<div class="empty-state">暂无建议</div>';
  } else {
    html += '<ul style="padding-left:20px">';
    metrics.suggestions.forEach(function(s) {
      html += '<li style="padding:8px 0;font-size:14px;color:var(--gray-700)">' + escapeHtml(s) + '</li>';
    });
    html += '</ul>';
  }
  html += '</div>';

  container.innerHTML = html;
}

function buildStatCard(label, value, extraClass) {
  return ''
    + '<div class="stat-card ' + (extraClass || '') + '">'
    + '<div class="stat-value">' + value + '</div>'
    + '<div class="stat-label">' + escapeHtml(label) + '</div>'
    + '</div>';
}

function buildDistCard(title, dist) {
  var html = '<div class="card"><div class="card-title">' + escapeHtml(title) + '</div>';
  var entries = Object.entries(dist);
  if (entries.length === 0) {
    html += '<div class="empty-state">暂无数据</div>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr><th>类别</th><th>数量</th></tr></thead><tbody>';
    var total = entries.reduce(function(s, e) { return s + e[1]; }, 0);
    entries.forEach(function(e) {
      var pct = total > 0 ? Math.round(e[1] / total * 100) + '%' : '0%';
      html += '<tr><td>' + escapeHtml(e[0]) + '</td><td>' + e[1] + '（' + pct + '）</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  return html;
}

function buildKeyEldersCard(state) {
  var html = '<div class="card"><div class="card-title">重点老人列表</div>';

  // 从工单中提取涉及到的老人
  var elderOrderMap = {};
  state.workOrders.forEach(function(o) {
    if (!elderOrderMap[o.elderId]) {
      elderOrderMap[o.elderId] = { elderName: o.elderName, latestRisk: o.riskLevel, latestEvent: o.eventType, status: o.status, time: o.updatedAt || o.createdAt, assignee: o.assignee };
    } else {
      // 保留最新的
      if ((o.updatedAt || o.createdAt) > elderOrderMap[o.elderId].time) {
        elderOrderMap[o.elderId] = { elderName: o.elderName, latestRisk: o.riskLevel, latestEvent: o.eventType, status: o.status, time: o.updatedAt || o.createdAt, assignee: o.assignee };
      }
    }
  });

  var entries = Object.entries(elderOrderMap);
  if (entries.length === 0) {
    html += '<div class="empty-state">暂无数据</div>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>'
      + '<th>老人姓名</th><th>最近风险等级</th><th>最近事件类型</th><th>工单状态</th><th>最近处理时间</th><th>责任人</th>'
      + '</tr></thead><tbody>';
    entries.forEach(function(e) {
      var v = e[1];
      html += '<tr>'
        + '<td>' + escapeHtml(v.elderName) + '</td>'
        + '<td>' + riskTag(v.latestRisk) + '</td>'
        + '<td>' + escapeHtml(v.latestEvent) + '</td>'
        + '<td>' + statusTag(v.status) + '</td>'
        + '<td>' + escapeHtml(v.time) + '</td>'
        + '<td>' + escapeHtml(v.assignee) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  return html;
}

/* ============================
   模块 8：数据记录
   ============================ */

function renderDataTables() {
  var container = document.getElementById('dataSection');
  if (!container) return;
  var state = getStateSafe();

  var html = '<h2 class="section-title">数据记录</h2>';

  // 操作按钮
  html += '<div class="card">'
    + '<div class="btn-group">'
    + '<button class="btn btn-primary" onclick="loadSampleData()">载入示例数据</button>'
    + '<button class="btn btn-danger" onclick="clearAllData()">清空演示数据</button>'
    + '<button class="btn btn-outline" onclick="downloadJSON()">导出当前数据（JSON）</button>'
    + '<button class="btn btn-outline" onclick="showImportDialog()">从 JSON 导入数据</button>'
    + '</div>'
    + '<div id="importDialog" style="margin-top:12px;"></div>'
    + '</div>';

  // 老人档案表
  html += '<div class="card"><div class="card-title">老人档案</div>';
  if (state.elders.length === 0) {
    html += '<div class="empty-state">暂无数据</div>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>'
      + '<th>老人 ID</th><th>姓名</th><th>年龄</th><th>地址</th><th>健康标签</th><th>紧急联系人</th><th>服务等级</th><th>最近状态</th>'
      + '</tr></thead><tbody>';
    state.elders.forEach(function(e) {
      html += '<tr>'
        + '<td>' + escapeHtml(e.id) + '</td><td>' + escapeHtml(e.name) + '</td><td>' + e.age + '</td><td>' + escapeHtml(e.address) + '</td>'
        + '<td>' + escapeHtml((e.healthTags || []).join('、')) + '</td><td>' + escapeHtml(e.emergencyContact) + '</td>'
        + '<td>' + escapeHtml(e.serviceLevel) + '</td><td>' + escapeHtml(e.lastStatus) + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  // 报平安/求助记录表
  html += '<div class="card"><div class="card-title">报平安/求助记录</div>';
  if (state.careRecords.length === 0) {
    html += '<div class="empty-state">暂无数据</div>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>'
      + '<th>记录 ID</th><th>时间</th><th>老人</th><th>状态</th><th>求助类型</th><th>设备提醒</th>'
      + '<th>描述</th><th>AI 风险</th><th>AI 事件类型</th><th>AI 置信度</th>'
      + '<th>复核风险</th><th>复核事件类型</th><th>是否已复核</th><th>AI 被修改</th>'
      + '</tr></thead><tbody>';
    state.careRecords.forEach(function(r) {
      var ai = r.aiResult || {};
      html += '<tr>'
        + '<td>' + escapeHtml(r.id) + '</td><td>' + escapeHtml(r.createdAt) + '</td><td>' + escapeHtml(r.elderName) + '</td>'
        + '<td>' + escapeHtml(r.status) + '</td><td>' + escapeHtml(r.requestType || '无') + '</td><td>' + escapeHtml(r.deviceAlert || '无') + '</td>'
        + '<td>' + escapeHtml(r.description || '') + '</td><td>' + riskTag(ai.riskLevel || '') + '</td>'
        + '<td>' + escapeHtml(ai.eventType || '') + '</td><td>' + (ai.confidence ? Math.round(ai.confidence * 100) + '%' : '') + '</td>'
        + '<td>' + riskTag(r.reviewRiskLevel || '') + '</td><td>' + escapeHtml(r.reviewEventType || '') + '</td>'
        + '<td>' + (r.reviewed ? '<span style="color:var(--green)">是</span>' : '<span style="color:var(--orange)">否</span>') + '</td>'
        + '<td>' + (r.isAiModified ? '<span style="color:var(--red);font-weight:600">是</span>' : '<span style="color:var(--gray-400)">否</span>') + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  // 服务工单表
  html += '<div class="card"><div class="card-title">服务工单</div>';
  if (state.workOrders.length === 0) {
    html += '<div class="empty-state">暂无数据</div>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>'
      + '<th>工单编号</th><th>老人</th><th>风险</th><th>事件类型</th><th>责任人</th><th>状态</th>'
      + '<th>处理角色</th><th>处理结果</th><th>评价</th><th>评价备注</th><th>上传照片</th>'
      + '</tr></thead><tbody>';
    state.workOrders.forEach(function(o) {
      html += '<tr>'
        + '<td>' + escapeHtml(o.id) + '</td><td>' + escapeHtml(o.elderName) + '</td><td>' + riskTag(o.riskLevel) + '</td>'
        + '<td>' + escapeHtml(o.eventType) + '</td><td>' + escapeHtml(o.assignee) + '</td><td>' + statusTag(o.status) + '</td>'
        + '<td>' + escapeHtml(o.processRole || '—') + '</td><td>' + escapeHtml(o.result || '—') + '</td>'
        + '<td>' + escapeHtml(o.rating || '—') + '</td><td>' + escapeHtml(o.ratingComment || '—') + '</td>'
        + '<td>' + (o.photoUploaded ? '<span style="color:var(--green)">是</span>' : '<span style="color:var(--gray-400)">否</span>') + '</td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';

  container.innerHTML = html;
}

function showImportDialog() {
  var dialog = document.getElementById('importDialog');
  if (!dialog) return;
  dialog.innerHTML = ''
    + '<div class="card" style="border:2px solid var(--primary)">'
    + '<div class="card-title">从 JSON 导入数据</div>'
    + '<div class="form-group">'
    + '<label>粘贴 JSON 数据</label>'
    + '<textarea id="importJsonText" class="form-control" rows="6" placeholder="请粘贴之前导出的 JSON 数据..."></textarea>'
    + '</div>'
    + '<div class="btn-group">'
    + '<button class="btn btn-primary" onclick="doImport()">确认导入</button>'
    + '<button class="btn btn-outline" onclick="document.getElementById(\'importDialog\').innerHTML=\'\'">取消</button>'
    + '</div>'
    + '</div>';
}

/* ============================
   模块 9：AI 功能说明
   ============================ */

function renderAIDocPage() {
  var container = document.getElementById('aiDocSection');
  if (!container) return;
  container.innerHTML = ''
    + '<h2 class="section-title">嵌入式 AI 能力演示：风险识别与派单推荐智能辅助</h2>'
    + '<div class="doc-section">'
    + '<div class="card">'
    + '<h3>一、AI 嵌入节点</h3>'
    + '<ol>'
    + '<li>老人/家属提交求助后</li>'
    + '<li>系统对文本、状态和设备提醒进行识别</li>'
    + '<li>输出风险等级、事件类型、触发原因和建议处置</li>'
    + '<li>网格员人工复核</li>'
    + '<li>复核后生成工单和派单建议</li>'
    + '</ol>'
    + '</div>'
    + '<div class="card">'
    + '<h3>二、AI 输入数据</h3>'
    + '<ul>'
    + '<li>今日状态（正常/轻微不适/紧急求助）</li>'
    + '<li>求助类型（无/健康/生活/维修/陪诊/其他）</li>'
    + '<li>求助文本描述</li>'
    + '<li>设备提醒（无/跌倒提醒/烟感提醒/水浸提醒/长时间未活动）</li>'
    + '<li>老人历史标签（健康标签、服务等级）</li>'
    + '<li>历史工单记录</li>'
    + '<li>人员资源和技能标签</li>'
    + '</ul>'
    + '</div>'
    + '<div class="card">'
    + '<h3>三、AI 输出结果</h3>'
    + '<ul>'
    + '<li>风险等级（低风险/中风险/高风险）</li>'
    + '<li>事件类型（健康类/维修类/生活服务类/陪诊类/无异常）</li>'
    + '<li>触发原因列表</li>'
    + '<li>AI 置信度（60%~98%）</li>'
    + '<li>建议处置方案</li>'
    + '<li>推荐责任人（根据事件类型和风险等级自动推荐）</li>'
    + '<li>推荐处理时限（根据紧急程度自动设定）</li>'
    + '<li>可解释规则说明（状态规则、设备规则、文本规则、分类规则）</li>'
    + '</ul>'
    + '</div>'
    + '<div class="card">'
    + '<h3>四、AI 使用边界</h3>'
    + '<ul>'
    + '<li>系统不替代医生诊断</li>'
    + '<li>系统不输出确诊、治疗方案等医疗结论</li>'
    + '<li>高风险事件必须由社区工作人员人工复核</li>'
    + '<li>系统只提供优先级建议，不直接决定是否延迟服务</li>'
    + '<li>老人健康、住址、联系方式等敏感数据按角色分级授权</li>'
    + '<li>所有 AI 判断和人工修改均需留痕</li>'
    + '</ul>'
    + '</div>'
    + '<div class="card">'
    + '<h3>五、AI 功能演示脚本</h3>'
    + '<div class="demo-script-box">'
    + '输入：\n老人跌倒，家属联系不上，设备触发跌倒提醒。\n\n'
    + 'AI 输出：\n风险等级：高风险\n事件类型：健康类\n触发原因：状态为"紧急求助"，设备触发"跌倒提醒"，描述包含"跌倒""联系不上"\n'
    + '建议处置：立即派单，通知家属和社区医生。\n推荐责任人：社区医生 + 网格员。\n推荐处理时限：30 分钟内响应。\n\n'
    + '可解释规则：\n- 状态规则：今日状态为"紧急求助"，触发高风险规则\n- 设备规则：设备提醒为"跌倒提醒"，触发高风险规则\n'
    + '- 文本规则：描述包含"跌倒、联系不上"等关键词\n- 分类规则：求助类型为"健康"，识别为健康类事件\n\n'
    + '控制边界：必须由网格员人工复核后生成应急工单。\nAI 结果仅作辅助，需人工确认。'
    + '</div>'
    + '</div>'
    + '<div class="card">'
    + '<h3>六、技术实现说明</h3>'
    + '<p>本原型阶段采用<strong>规则引擎</strong>模拟嵌入式 AI 能力，目的是展示 AI 如何服务业务流程。'
    + '后续可替换为文本分类模型、大语言模型接口或轻量化机器学习模型，但仍必须保留人工复核和风险边界。</p>'
    + '</div>'
    + '</div>';
}

/* ============================
   模块 10：系统文档
   ============================ */

function renderSystemDocPage() {
  var container = document.getElementById('systemDocSection');
  if (!container) return;
  container.innerHTML = ''
    + '<h2 class="section-title">系统文档：开发与集成工程师交付说明</h2>'
    + '<div class="doc-section">'
    + '<div class="card">'
    + '<h3>原型系统说明</h3>'
    + '<p>社区独居老人照护风险预警与服务调度系统 V1.2。使用纯 HTML + CSS + JavaScript 实现，所有数据存储在浏览器 localStorage 中，可在本地直接双击 index.html 运行。</p>'
    + '</div>'
    + '<div class="card">'
    + '<h3>页面实现清单</h3>'
    + '<div class="table-wrap"><table><thead><tr><th>模块</th><th>页面名称</th><th>对应 JS 渲染函数</th></tr></thead><tbody>'
    + '<tr><td>模块 1</td><td>首页概览</td><td>renderHome()</td></tr>'
    + '<tr><td>模块 2</td><td>老人/家属端</td><td>renderElderForm()</td></tr>'
    + '<tr><td>模块 3</td><td>智能风险识别</td><td>renderAIResult()</td></tr>'
    + '<tr><td>模块 4</td><td>网格员复核</td><td>renderReviewPage()</td></tr>'
    + '<tr><td>模块 5</td><td>工单调度</td><td>renderWorkOrderPage()</td></tr>'
    + '<tr><td>模块 6</td><td>协同处理</td><td>renderCollaborationPage()</td></tr>'
    + '<tr><td>模块 7</td><td>管理驾驶舱</td><td>renderDashboard()</td></tr>'
    + '<tr><td>模块 8</td><td>数据记录</td><td>renderDataTables()</td></tr>'
    + '<tr><td>模块 9</td><td>AI 功能说明</td><td>renderAIDocPage()</td></tr>'
    + '<tr><td>模块 10</td><td>系统文档</td><td>renderSystemDocPage()</td></tr>'
    + '</tbody></table></div>'
    + '</div>'
    + '<div class="card">'
    + '<h3>功能联调记录</h3>'
    + '<div class="table-wrap"><table><thead><tr><th>编号</th><th>功能</th><th>输入</th><th>输出</th><th>状态</th></tr></thead><tbody>'
    + '<tr><td>F01</td><td>报平安提交</td><td>老人姓名、状态、描述、设备提醒</td><td>生成求助记录</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '<tr><td>F02</td><td>AI 风险识别</td><td>求助记录</td><td>风险等级、事件类型、原因、置信度</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '<tr><td>F03</td><td>人工复核</td><td>AI 识别结果、复核意见</td><td>最终风险等级（含 AI 修改留痕）</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '<tr><td>F04</td><td>工单生成</td><td>复核结果</td><td>服务工单</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '<tr><td>F05</td><td>派单推荐</td><td>事件类型、风险等级</td><td>推荐责任人和时限</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '<tr><td>F06</td><td>协同处理</td><td>工单状态和处理结果</td><td>工单完成并保存反馈（含处理角色、上传照片）</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '<tr><td>F07</td><td>管理看板</td><td>记录与工单数据</td><td>统计指标和复盘建议（今日/累计）</td><td><span style="color:var(--green);font-weight:700">通过</span></td></tr>'
    + '</tbody></table></div>'
    + '</div>'
    + '<div class="card">'
    + '<h3>版本迭代记录</h3>'
    + '<div class="table-wrap"><table><thead><tr><th>版本</th><th>内容</th></tr></thead><tbody>'
    + '<tr><td>V0.1</td><td>完成基础页面结构和导航</td></tr>'
    + '<tr><td>V0.2</td><td>完成报平安表单和本地数据存储</td></tr>'
    + '<tr><td>V0.3</td><td>完成 AI 风险识别与派单推荐</td></tr>'
    + '<tr><td>V0.4</td><td>完成人工复核和工单生成</td></tr>'
    + '<tr><td>V0.5</td><td>完成协同处理和管理驾驶舱</td></tr>'
    + '<tr><td>V1.0</td><td>整理文档、演示脚本和测试数据</td></tr>'
    + '<tr><td>V1.1</td><td>新增推荐责任主体、可解释规则、协同处理留痕、演示进度提示、安全防护、今日/累计指标</td></tr>'
    + '</tbody></table></div>'
    + '</div>'
    + '</div>';
}

/* ============================
   角色选择
   ============================ */

function selectRole(el) {
  var all = document.querySelectorAll('.role-option');
  all.forEach(function(a) { a.classList.remove('selected'); });
  el.classList.add('selected');
}

/* ============================
   模拟上传照片
   ============================ */

function fakeUpload() {
  var btn = document.getElementById('fakeUploadBtn');
  var status = document.getElementById('uploadStatus');
  if (btn) {
    btn.textContent = '已模拟上传照片';
    btn.classList.add('done');
    btn.disabled = true;
  }
  if (status) {
    status.textContent = '照片已模拟上传成功';
  }
}
