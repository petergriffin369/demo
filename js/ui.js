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
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
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
  // 颜色 + 图标双重标识，确保色觉障碍用户也可辨识
  if (level === '高风险') return '<span class="tag tag-high" title="高风险">⚠ 高风险</span>';
  if (level === '中风险') return '<span class="tag tag-mid" title="中风险">◈ 中风险</span>';
  if (level === '低风险') return '<span class="tag tag-low" title="低风险">✔ 低风险</span>';
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
  return window.appState || { elders: [], resources: [], careRecords: [], workOrders: [], auditLogs: [], customRiskKeywords: { high: [], medium: [], health: [], maintenance: [], life: [], companion: [] } };
}

/**
 * 获取老人最近服务闭环状态
 * @param {string} elderId 老人 ID
 * @param {Object} state 全局状态
 * @returns {string} HTML 标签
 */
function getElderClosureStatus(elderId, state) {
  var orders = (state.workOrders || []).filter(function(o) { return o.elderId === elderId; });
  if (orders.length === 0) {
    var records = (state.careRecords || []).filter(function(r) { return r.elderId === elderId; });
    if (records.length === 0) {
      return '<span class="closure-badge closure-none">未提交</span>';
    }
    var unreviewed = records.filter(function(r) { return !r.reviewed; });
    if (unreviewed.length > 0) {
      return '<span class="closure-badge closure-pending">待复核</span>';
    }
    return '<span class="closure-badge closure-none">未生成工单</span>';
  }
  // 按创建时间排序，取最新
  orders.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
  var latest = orders[0];
  if (latest.status === '已完成' || latest.status === '已关闭') {
    return '<span class="closure-badge closure-completed">已完成</span>';
  }
  if (latest.status === '处理中') {
    return '<span class="closure-badge closure-processing">处理中</span>';
  }
  if (latest.status === '已派单') {
    return '<span class="closure-badge closure-processing">已派单</span>';
  }
  return '<span class="closure-badge closure-pending">待派单</span>';
}

/**
 * 将系统角色映射为协同处理角色
 * @param {string} systemRole 系统角色
 * @returns {string} 协同处理角色
 */
function mapRoleToProcessRole(systemRole) {
  var map = {
    '网格员': '网格员',
    '社区医生': '社区医生',
    '物业/维修人员': '物业/维修人员',
    '志愿者': '志愿者'
  };
  return map[systemRole] || '网格员';
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
  var state = getStateSafe();
  var role = state.currentRole || '网格员';
  var html = '<div class="card"><div class="card-title">快捷操作（' + escapeHtml(role) + '）</div>'
    + '<div class="quick-actions">';

  if (role === '老人/家属') {
    html += '<button class="btn btn-primary quick-btn" onclick="showSection(\'elderFormSection\');renderElderForm();">'
      + '<span class="quick-btn-icon">＋</span>提交报平安 / 求助</button>'
      + '<button class="btn btn-outline quick-btn" onclick="showSection(\'collaborationSection\');renderCollaborationPage();">'
      + '<span class="quick-btn-icon">📋</span>查看工单进度</button>';
  } else if (role === '网格员') {
    html += '<button class="btn btn-primary quick-btn" onclick="showSection(\'reviewSection\');renderReviewPage();">'
      + '<span class="quick-btn-icon">✅</span>待复核记录</button>'
      + '<button class="btn btn-primary quick-btn" onclick="showSection(\'workOrderSection\');renderWorkOrderPage();">'
      + '<span class="quick-btn-icon">📋</span>工单调度</button>'
      + '<button class="btn btn-outline quick-btn" onclick="showSection(\'elderFormSection\');renderElderForm();">'
      + '<span class="quick-btn-icon">📝</span>巡访记录</button>';
  } else if (role === '社区医生') {
    html += '<button class="btn btn-primary quick-btn" onclick="showSection(\'workOrderSection\');renderWorkOrderPage();">'
      + '<span class="quick-btn-icon">🏥</span>健康类工单</button>'
      + '<button class="btn btn-outline quick-btn" onclick="showSection(\'collaborationSection\');renderCollaborationPage();">'
      + '<span class="quick-btn-icon">⏳</span>处理中工单</button>';
  } else if (role === '物业/维修人员') {
    html += '<button class="btn btn-primary quick-btn" onclick="showSection(\'workOrderSection\');renderWorkOrderPage();">'
      + '<span class="quick-btn-icon">🔧</span>维修类工单</button>';
  } else if (role === '志愿者') {
    html += '<button class="btn btn-primary quick-btn" onclick="showSection(\'workOrderSection\');renderWorkOrderPage();">'
      + '<span class="quick-btn-icon">🤝</span>生活服务 / 陪诊类工单</button>'
      + '<button class="btn btn-outline quick-btn" onclick="showSection(\'collaborationSection\');renderCollaborationPage();">'
      + '<span class="quick-btn-icon">📋</span>处理中工单</button>';
  } else if (role === '社区管理者') {
    html += '<button class="btn btn-primary quick-btn" onclick="showSection(\'dashboardSection\');renderDashboard();">'
      + '<span class="quick-btn-icon">📊</span>管理驾驶舱</button>'
      + '<button class="btn btn-outline quick-btn" onclick="showSection(\'dataSection\');renderDataTables();">'
      + '<span class="quick-btn-icon">📁</span>数据记录</button>'
      + '<button class="btn btn-outline quick-btn" onclick="showSection(\'aiDocSection\');renderAIDocPage();">'
      + '<span class="quick-btn-icon">⚙️</span>规则配置</button>';
  }

  html += '</div></div>';
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
    + '<div class="card-title">常见场景快速录入</div>'
    + '<div class="example-btns">'
    + '<button class="btn btn-outline btn-sm" onclick="fillExample(1)">正常报平安场景（王奶奶）</button>'
    + '<button class="btn btn-outline btn-sm" onclick="fillExample(2)">未报平安核实场景（李爷爷）</button>'
    + '<button class="btn btn-warning btn-sm" onclick="fillExample(3)">跌倒紧急求助场景（张阿姨）</button>'
    + '<button class="btn btn-outline btn-sm" onclick="fillExample(4)">居家维修求助场景（陈爷爷）</button>'
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
    + '<label>健康标签</label>'
    + '<input type="text" id="elderHealthTags" class="form-control" readonly>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>紧急联系人</label>'
    + '<input type="text" id="elderEmergencyContact" class="form-control" readonly>'
    + '</div>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>服务等级</label>'
    + '<input type="text" id="elderServiceLevel" class="form-control" readonly>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>是否需要回访</label>'
    + '<select id="needFollowUpSelect" class="form-control">'
    + '<option value="否">否</option>'
    + '<option value="是">是</option>'
    + '</select>'
    + '</div>'
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
    + '<textarea id="descText" class="form-control" placeholder="请描述老人当前情况..." maxlength="500"></textarea>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>期望处理方式</label>'
    + '<select id="handlingMethodSelect" class="form-control">'
    + '<option value="仅记录">仅记录</option>'
    + '<option value="电话核实">电话核实</option>'
    + '<option value="上门核实">上门核实</option>'
    + '<option value="生成工单">生成工单</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>联系电话</label>'
    + '<input type="tel" id="phoneInput" class="form-control" placeholder="请输入联系电话" pattern="[0-9]{7,15}" maxlength="15" title="请输入 7-15 位数字电话号码">'
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
    document.getElementById('elderAddress').value = privacyValue(elder.address, maskAddress);
    document.getElementById('elderHealthTags').value = (elder.healthTags || []).join('、');
    document.getElementById('elderEmergencyContact').value = privacyValue(elder.emergencyContact || '', maskEmergencyContact);
    document.getElementById('elderServiceLevel').value = elder.serviceLevel || '';
  } else {
    document.getElementById('elderAge').value = '';
    document.getElementById('elderAddress').value = '';
    document.getElementById('elderHealthTags').value = '';
    document.getElementById('elderEmergencyContact').value = '';
    document.getElementById('elderServiceLevel').value = '';
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
    + '<div class="detail-item"><div class="detail-label">服务等级</div><div class="detail-value">' + escapeHtml(record.serviceLevel || '') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">今日状态</div><div class="detail-value">' + escapeHtml(record.status) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">求助类型</div><div class="detail-value">' + escapeHtml(record.requestType || '无') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">设备提醒</div><div class="detail-value">' + escapeHtml(record.deviceAlert || '无') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">提交人</div><div class="detail-value">' + escapeHtml(record.reporterRole || '') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">提交时间</div><div class="detail-value">' + escapeHtml(record.createdAt || '') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">健康标签</div><div class="detail-value">' + escapeHtml((record.healthTags || []).join('、')) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">紧急联系人</div><div class="detail-value">' + escapeHtml(privacyValue(record.emergencyContact || '', maskEmergencyContact)) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">是否回访</div><div class="detail-value">' + escapeHtml(record.needFollowUp || '') + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">处理方式</div><div class="detail-value">' + escapeHtml(record.handlingMethod || '') + '</div></div>'
    + '<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">描述</div><div class="detail-value">' + escapeHtml(record.description || '无') + '</div></div>'
    + '</div>'
    + '</div>';
}

function buildAIResultCard(record) {
  var ai = record.aiResult;
  if (!ai) return '';

  var confValue = ai.confidence;
  var confPercent = Math.round(confValue * 100) + '%';
  var confLevel = getConfidenceLevel(confValue);

  // 获取推荐责任主体和处理时限
  var recommend = recommendAssignee(ai.eventType, ai.riskLevel);

  // 生成可解释规则说明
  var explainableRules = buildExplainableRules(record, ai);

  // 判断 AI 来源
  var isLLM = (ai.aiModeUsed === 'llm' && ai.fallback === false);
  var isFallback = (ai.fallback === true);

  var html = ''
    + '<div class="card ai-result-card">'
    + '<div class="ai-result-header">'
    + '<h4>AI 识别结果</h4>'
    + '<div class="ai-confidence">'
    + '置信度：' + confPercent
    + ' <span class="confidence-badge ' + confLevel.cls + '">' + confLevel.label + '</span>'
    + '</div>'
    + '</div>';

  // === AI 来源标识条 ===
  if (isLLM) {
    html += '<div class="ai-source-banner ai-source-llm">'
      + '🤖 当前结果来自 <strong>DeepSeek 真实大语言模型 API</strong>'
      + '</div>';
  } else if (isFallback) {
    html += '<div class="ai-source-banner ai-source-fallback">'
      + '⚠️ 当前结果来自 <strong>本地规则引擎兜底</strong>，DeepSeek 调用失败'
      + '</div>';
  }

  // 低置信度提示
  if (confValue < 0.70) {
    html += '<div class="alert alert-warning" style="margin-bottom:16px">'
      + '⚠️ 当前 AI 置信度较低（' + confPercent + '），建议网格员重点核实。'
      + '</div>';
  }

  html += '<div class="detail-grid">'
    + '<div class="detail-item"><div class="detail-label">风险等级</div><div class="detail-value">' + riskTag(ai.riskLevel) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">事件类型</div><div class="detail-value"><span class="tag tag-info">' + escapeHtml(ai.eventType) + '</span></div></div>'
    + '<div class="detail-item"><div class="detail-label">推荐责任主体</div><div class="detail-value" style="font-weight:600">' + escapeHtml(recommend.assignee) + '</div></div>'
    + '<div class="detail-item"><div class="detail-label">推荐处理时限</div><div class="detail-value" style="font-weight:600;color:var(--primary-dark)">' + escapeHtml(recommend.deadline) + '</div></div>'
    + '<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">触发原因</div>'
    + '<ul class="ai-reasons">' + ai.reasons.map(function(r) { return '<li>' + escapeHtml(r) + '</li>'; }).join('') + '</ul></div>'
    + '<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">建议处置</div><div class="detail-value" style="font-weight:600;color:var(--primary-dark)">' + escapeHtml(ai.suggestion) + '</div></div>'
    + '</div>';

  // === AI 来源元数据 ===
  html += '<div class="ai-metadata">'
    + '<div class="ai-metadata-title">AI 来源信息</div>'
    + '<div class="ai-metadata-grid">'
    + '<div class="ai-meta-item"><span class="ai-meta-label">AI 来源</span><span class="ai-meta-value">' + escapeHtml(ai.modelProvider || '未知') + '</span></div>'
    + '<div class="ai-meta-item"><span class="ai-meta-label">模型名称</span><span class="ai-meta-value">' + escapeHtml(ai.modelName || '未知') + '</span></div>'
    + '<div class="ai-meta-item"><span class="ai-meta-label">是否真实 API</span><span class="ai-meta-value">' + (isLLM ? '<span style="color:var(--green);font-weight:600">是 ✓</span>' : '<span style="color:var(--orange);font-weight:600">否 ✗</span>') + '</span></div>'
    + '<div class="ai-meta-item"><span class="ai-meta-label">是否兜底</span><span class="ai-meta-value">' + (isFallback ? '<span style="color:var(--orange);font-weight:600">是 ⚠</span>' : '<span style="color:var(--green);font-weight:600">否</span>') + '</span></div>'
    + '<div class="ai-meta-item"><span class="ai-meta-label">兜底原因</span><span class="ai-meta-value">' + escapeHtml(ai.fallbackReason || '不适用') + '</span></div>'
    + '<div class="ai-meta-item"><span class="ai-meta-label">是否已脱敏</span><span class="ai-meta-value">' + (ai.privacyProtected ? '<span style="color:var(--green);font-weight:600">是 🔒</span>' : '<span style="color:var(--gray-500)">否</span>') + '</span></div>'
    + '</div>'
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
 * 获取置信度等级
 * @param {number} confidence 置信度数值 (0-1)
 * @returns {{ label: string, cls: string }}
 */
function getConfidenceLevel(confidence) {
  if (confidence >= 0.80) return { label: '高置信度', cls: 'conf-high' };
  if (confidence >= 0.65) return { label: '中置信度', cls: 'conf-mid' };
  return { label: '低置信度', cls: 'conf-low' };
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
  var customKeywords = [];
  var highKeywords = (RISK_KEYWORDS.high || []).concat(
    (window.appState && window.appState.customRiskKeywords && window.appState.customRiskKeywords.high) ? window.appState.customRiskKeywords.high : []
  );
  var mediumKeywords = (RISK_KEYWORDS.medium || []).concat(
    (window.appState && window.appState.customRiskKeywords && window.appState.customRiskKeywords.medium) ? window.appState.customRiskKeywords.medium : []
  );
  for (var i = 0; i < highKeywords.length; i++) {
    if (desc.indexOf(highKeywords[i]) !== -1) allKeywords.push(highKeywords[i]);
  }
  for (var j = 0; j < mediumKeywords.length; j++) {
    if (desc.indexOf(mediumKeywords[j]) !== -1) allKeywords.push(mediumKeywords[j]);
  }
  // 检测哪些是自定义关键词
  var customHigh = (window.appState && window.appState.customRiskKeywords && window.appState.customRiskKeywords.high) ? window.appState.customRiskKeywords.high : [];
  var customMedium = (window.appState && window.appState.customRiskKeywords && window.appState.customRiskKeywords.medium) ? window.appState.customRiskKeywords.medium : [];
  for (var k = 0; k < allKeywords.length; k++) {
    if (customHigh.indexOf(allKeywords[k]) !== -1 || customMedium.indexOf(allKeywords[k]) !== -1) {
      customKeywords.push(allKeywords[k]);
    }
  }
  if (allKeywords.length > 0) {
    rules.push('文本规则：描述包含"' + allKeywords.join('、') + '"等关键词');
  } else {
    rules.push('文本规则：描述中未匹配到风险关键词');
  }
  // 标注自定义关键词命中
  if (customKeywords.length > 0) {
    rules.push('自定义规则：命中自定义规则关键词"' + customKeywords.join('、') + '"');
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

  // 服务等级规则
  if (record.serviceLevel === '重点关注') {
    rules.push('档案规则：老人服务等级为"重点关注"，纳入重点识别范围');
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
  // 页面渲染后检查 AI 修改状态
  setTimeout(function() { checkAiModification(); }, 50);
}

function buildReviewForm(record) {
  var ai = record.aiResult || {};
  var isMediumOrHigh = (ai.riskLevel === '中风险' || ai.riskLevel === '高风险');
  return ''
    + '<div class="card">'
    + '<div class="card-title">人工复核</div>'
    + '<div class="alert alert-info">请根据实际情况确认或修改 AI 的判断结果。AI 判断和人工最终判断都将被记录。如修改 AI 判断，必须填写修改原因。</div>'
    + '<form id="reviewForm" onsubmit="return false;">'
    + '<input type="hidden" id="reviewRecordId" value="' + record.id + '">'
    + '<div class="form-row">'
    + '<div class="form-group">'
    + '<label>复核风险等级 <span class="required">*</span></label>'
    + '<select id="reviewRiskLevel" class="form-control" required onchange="checkAiModification()">'
    + '<option value="低风险"' + (ai.riskLevel === '低风险' ? ' selected' : '') + '>低风险</option>'
    + '<option value="中风险"' + (ai.riskLevel === '中风险' ? ' selected' : '') + '>中风险</option>'
    + '<option value="高风险"' + (ai.riskLevel === '高风险' ? ' selected' : '') + '>高风险</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>复核事件类型 <span class="required">*</span></label>'
    + '<select id="reviewEventType" class="form-control" required onchange="checkAiModification()">'
    + buildEventTypeOptions(ai.eventType)
    + '</select>'
    + '</div>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>复核意见</label>'
    + '<textarea id="reviewComment" class="form-control" placeholder="请填写复核意见..."></textarea>'
    + '</div>'
    + '<div class="form-group" id="correctionReasonGroup" style="display:none">'
    + '<label>修改原因 <span class="required" style="color:var(--red)">*</span>（修改了 AI 判断必须填写）</label>'
    + '<textarea id="correctionReason" class="form-control" placeholder="请说明为什么修改 AI 的判断结果..."></textarea>'
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
    + '<div class="detail-item"><div class="detail-label">地址</div><div class="detail-value">' + escapeHtml(privacyValue(order.address, maskAddress)) + '</div></div>'
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

  // 处理时间线
  html += buildOrderTimeline(order);

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

/**
 * 构建工单处理时间线
 * @param {Object} order 工单对象
 * @returns {string} HTML
 */
function buildOrderTimeline(order) {
  var state = getStateSafe();
  // 查找关联的求助记录获取时间信息
  var record = null;
  var records = state.careRecords || [];
  for (var i = 0; i < records.length; i++) {
    if (records[i].id === order.recordId) {
      record = records[i];
      break;
    }
  }

  var steps = [];

  // 1. 求助提交
  if (record && record.createdAt) {
    steps.push({ label: '求助提交', time: record.createdAt, done: true });
  }
  // 2. AI 识别完成
  if (record && record.aiAnalyzedAt) {
    steps.push({ label: 'AI 识别完成', time: record.aiAnalyzedAt, done: true });
  } else if (record && record.createdAt) {
    steps.push({ label: 'AI 识别完成', time: record.createdAt, done: true });
  }
  // 3. 人工复核
  if (record && record.reviewInfo && record.reviewInfo.reviewedAt) {
    steps.push({ label: '人工复核', time: record.reviewInfo.reviewedAt, done: true });
  } else if (record && record.reviewed) {
    steps.push({ label: '人工复核', time: order.createdAt, done: true });
  } else {
    steps.push({ label: '人工复核', time: null, done: false });
  }
  // 4. 工单创建
  if (order.createdAt) {
    steps.push({ label: '工单创建', time: order.createdAt, done: true });
  }
  // 5. 派单
  if (order.assignedAt) {
    steps.push({ label: '派单确认', time: order.assignedAt, done: true });
  } else if (order.status !== '待派单') {
    steps.push({ label: '派单确认', time: order.createdAt, done: true });
  } else {
    steps.push({ label: '派单确认', time: null, done: false });
  }
  // 6. 接单
  if (order.acceptedAt) {
    steps.push({ label: '接单处理', time: order.acceptedAt, done: true });
  } else if (order.status === '处理中' || order.status === '已完成' || order.status === '已关闭') {
    steps.push({ label: '接单处理', time: null, done: true });
  } else {
    steps.push({ label: '接单处理', time: null, done: false });
  }
  // 7. 完成
  if (order.completedAt) {
    steps.push({ label: '处理完成', time: order.completedAt, done: true });
  } else if (order.status === '已完成' || order.status === '已关闭') {
    steps.push({ label: '处理完成', time: order.updatedAt, done: true });
  } else {
    steps.push({ label: '处理完成', time: null, done: false });
  }
  // 8. 评价
  if (order.ratingAt) {
    steps.push({ label: '评价反馈', time: order.ratingAt, done: true });
  } else if (order.rating) {
    steps.push({ label: '评价反馈', time: order.completedAt, done: true });
  } else {
    steps.push({ label: '评价反馈', time: null, done: false });
  }

  // 构建 HTML
  var html = '<div class="card" style="margin-top:12px">'
    + '<div class="card-title">处理时间线</div>'
    + '<div class="timeline">';

  for (var s = 0; s < steps.length; s++) {
    var step = steps[s];
    var dotClass = step.done ? 'timeline-dot done' : 'timeline-dot pending';
    var timeText = step.time ? step.time : '待处理';
    var itemClass = step.done ? 'timeline-item done' : 'timeline-item';
    html += '<div class="' + itemClass + '">'
      + '<div class="' + dotClass + '"></div>'
      + '<div class="timeline-content">'
      + '<div class="timeline-label">' + escapeHtml(step.label) + '</div>'
      + '<div class="timeline-time">' + escapeHtml(timeText) + '</div>'
      + '</div>'
      + '</div>';
  }

  html += '</div></div>';
  return html;
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

  // 根据当前角色确定默认处理角色
  var currentRole = state.currentRole || '网格员';
  var defaultProcessRole = mapRoleToProcessRole(currentRole);

  var html = '<h2 class="section-title">协同处理</h2>';

  if (orders.length === 0) {
    html += '<div class="card"><div class="empty-state">暂无已派单或处理中的工单。"待派单"工单请先在"工单调度"页面确认派单。</div></div>';
  } else {
    var roles = ['网格员', '社区医生', '物业/维修人员', '志愿者'];
    html += '<div class="card">'
      + '<div class="card-title">选择处理角色（当前：' + escapeHtml(currentRole) + '）</div>'
      + '<div class="role-selector">';
    roles.forEach(function(r) {
      var isSelected = (r === defaultProcessRole) ? ' selected' : '';
      html += '<div class="role-option' + isSelected + '" data-role="' + r + '" onclick="selectRole(this)">' + r + '</div>';
    });
    html += '</div></div>';

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
  window.currentProcessOrderId = orderId;
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
    + buildStatCard('高风险闭环率', metrics.highRiskClosureRate, 'stat-red')
    + buildStatCard('平均响应(分)', metrics.avgResponseMinutes, '')
    + buildStatCard('AI修改次数', metrics.aiModifiedCount, 'stat-orange')
    + '</div>';

  // 风险分布和工单状态分布
  html += '<div class="grid-2">'
    + buildDistCard('风险分布', metrics.riskDistribution)
    + buildDistCard('工单状态分布', metrics.workOrderDistribution)
    + '</div>';

  // AI 纠错分析
  html += buildAICorrectionCard(metrics.aiCorrections, metrics.aiModifiedCount);

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

function buildAICorrectionCard(corrections, totalModified) {
  var html = '<div class="card"><div class="card-title">AI 纠错分析</div>';
  if (corrections.length === 0) {
    html += '<div class="empty-state">暂无 AI 纠错记录，所有 AI 判断均被人工确认通过。</div>';
  } else {
    html += '<p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">'
      + '共 <strong style="color:var(--orange)">' + totalModified + '</strong> 次人工修改 AI 判断。'
      + '人工修改不代表 AI 错误，而是作为后续规则优化的重要参考依据。</p>';
    html += '<div class="table-wrap"><table><thead><tr>'
      + '<th>老人</th><th>记录时间</th><th>AI 风险</th><th>复核风险</th><th>AI 事件</th><th>复核事件</th><th>修改原因</th>'
      + '</tr></thead><tbody>';
    corrections.forEach(function(c) {
      html += '<tr>'
        + '<td>' + escapeHtml(c.elderName) + '</td>'
        + '<td>' + escapeHtml(c.createdAt || '') + '</td>'
        + '<td>' + riskTag(c.aiRiskLevel) + '</td>'
        + '<td>' + riskTag(c.reviewRiskLevel) + '</td>'
        + '<td>' + escapeHtml(c.aiEventType) + '</td>'
        + '<td>' + escapeHtml(c.reviewEventType) + '</td>'
        + '<td>' + escapeHtml(c.correctionReason || '未填写') + '</td>'
        + '</tr>';
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
    + '<button class="btn btn-primary" onclick="loadSampleData()">载入场景数据</button>'
    + '<button class="btn btn-danger" onclick="clearAllData()">清空业务数据</button>'
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
      + '<th>老人 ID</th><th>姓名</th><th>年龄</th><th>地址</th><th>健康标签</th><th>紧急联系人</th><th>服务等级</th><th>最近状态</th><th>服务闭环</th>'
      + '</tr></thead><tbody>';
    state.elders.forEach(function(e) {
      var closureStatus = getElderClosureStatus(e.id, state);
      html += '<tr>'
        + '<td>' + escapeHtml(e.id) + '</td><td>' + escapeHtml(e.name) + '</td><td>' + e.age + '</td><td>' + escapeHtml(privacyValue(e.address, maskAddress)) + '</td>'
        + '<td>' + escapeHtml((e.healthTags || []).join('、')) + '</td><td>' + escapeHtml(privacyValue(e.emergencyContact, maskEmergencyContact)) + '</td>'
        + '<td>' + escapeHtml(e.serviceLevel) + '</td><td>' + escapeHtml(e.lastStatus) + '</td>'
        + '<td>' + closureStatus + '</td>'
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
      + '<th>服务等级</th><th>是否回访</th><th>处理方式</th>'
      + '<th>描述</th><th>AI 风险</th><th>AI 事件类型</th><th>AI 置信度</th>'
      + '<th>复核风险</th><th>复核事件类型</th><th>是否已复核</th><th>AI 被修改</th>'
      + '</tr></thead><tbody>';
    state.careRecords.forEach(function(r) {
      var ai = r.aiResult || {};
      html += '<tr>'
        + '<td>' + escapeHtml(r.id) + '</td><td>' + escapeHtml(r.createdAt) + '</td><td>' + escapeHtml(r.elderName) + '</td>'
        + '<td>' + escapeHtml(r.status) + '</td><td>' + escapeHtml(r.requestType || '无') + '</td><td>' + escapeHtml(r.deviceAlert || '无') + '</td>'
        + '<td>' + escapeHtml(r.serviceLevel || '') + '</td>'
        + '<td>' + escapeHtml(r.needFollowUp || '') + '</td>'
        + '<td>' + escapeHtml(r.handlingMethod || '') + '</td>'
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

  // 审计日志表
  html += '<div class="card"><div class="card-title">审计日志（最近 100 条）</div>';
  var logs = state.auditLogs || [];
  if (logs.length === 0) {
    html += '<div class="empty-state">暂无审计日志</div>';
  } else {
    var recentLogs = logs.slice(-100).reverse();
    html += '<div class="table-wrap"><table><thead><tr>'
      + '<th>时间</th><th>操作角色</th><th>操作类型</th><th>对象类型</th><th>对象编号</th><th>操作说明</th>'
      + '</tr></thead><tbody>';
    recentLogs.forEach(function(log) {
      html += '<tr>'
        + '<td>' + escapeHtml(log.createdAt || '') + '</td>'
        + '<td>' + escapeHtml(log.operatorRole || '') + '</td>'
        + '<td>' + escapeHtml(log.action || '') + '</td>'
        + '<td>' + escapeHtml(log.targetType || '') + '</td>'
        + '<td>' + escapeHtml(log.targetId || '') + '</td>'
        + '<td>' + escapeHtml(log.detail || '') + '</td>'
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
    + '<textarea id="importJsonText" class="form-control" rows="6" placeholder="请粘贴之前导出的 JSON 数据..." maxlength="100000"></textarea>'
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
    + '<h2 class="section-title">智能辅助功能说明：风险识别与派单推荐</h2>'
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
    + '<h3>五、AI 功能运行示例</h3>'
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
    + '<h3>六、AI 复盘机制</h3>'
    + '<ul>'
    + '<li><strong>人工修改 ≠ AI 错误：</strong>人工复核修改 AI 判断结果，不是否定 AI，而是为后续规则优化提供参考依据。所有修改记录均在管理驾驶舱"AI 纠错分析"中可查。</li>'
    + '<li><strong>高风险场景必复核：</strong>所有求助记录均需人工复核，高风险事件必须生成工单并由网格员确认处置方案。</li>'
    + '<li><strong>不输出医疗诊断：</strong>系统不输出确诊、治疗方案等医疗结论，不替代专业判断。风险等级仅用于服务调度优先级排序。</li>'
    + '<li><strong>置信度分级提示：</strong>高置信度（≥80%）可快速复核，中置信度（65%-79%）建议关注，低置信度（＜65%）强制提示重点核实。</li>'
    + '<li><strong>纠错留痕：</strong>人工修改 AI 判断时，必须填写修改原因，所有修改痕迹均持久化存储。</li>'
    + '<li><strong>规则持续优化：</strong>通过管理驾驶舱的 AI 纠错分析，社区管理者可定期复盘修改模式，调整规则配置中的关键词和规则参数。</li>'
    + '</ul>'
    + '</div>'
    + '<div class="card">'
    + '<h3>七、技术实现说明</h3>'
    + '<p>系统<strong>默认接入 DeepSeek 真实大语言模型 API</strong>（deepseek-chat），通过本地代理服务（<code>server/server.js</code>）安全调用，API Key 仅存放在服务端 <code>.env</code> 中，不暴露到前端。</p>'
    + '<p>当 DeepSeek 不可用（网络异常、Key 错误、超时、返回格式异常）时，系统<strong>自动降级</strong>为本地规则引擎（<code>js/aiEngine.js</code>）兜底，确保业务流程不中断。</p>'
    + '<p>AI 识别结果卡片中明确标注数据来源（DeepSeek LLM / 规则引擎兜底）、模型名称、是否兜底、兜底原因和隐私脱敏状态，所有 AI 判断和人工修改均需留痕。</p>'
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
    + '<p>社区独居老人照护风险预警与服务调度系统 V1.9。使用纯 HTML + CSS + JavaScript 实现，所有数据存储在浏览器 localStorage 中，可在本地直接双击 index.html 运行。</p>'
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
    + '<tr><td>模块 11</td><td>规则配置</td><td>renderRuleConfigPage()</td></tr>'
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
    + '<h3>规则配置说明</h3>'
    + '<ul style="padding-left:20px;font-size:14px;color:var(--gray-700);line-height:2">'
    + '<li><strong>默认规则来源：</strong><code>data.js</code> 中的 <code>RISK_KEYWORDS</code> 常量，包含高风险、中风险、健康类、维修类、生活服务类、陪诊类六大类关键词。</li>'
    + '<li><strong>自定义规则来源：</strong><code>localStorage</code> 中 <code>customRiskKeywords</code> 字段，用户可通过"规则配置"页面在线增删关键词。</li>'
    + '<li><strong>规则合并策略：</strong>AI 分析引擎（<code>aiEngine.js</code>）通过 <code>getMergedRiskKeywords()</code> 合并默认规则和自定义规则后共同生效。</li>'
    + '<li><strong>后续迁移路径：</strong>接入真实后端时，<code>RISK_KEYWORDS</code> 可迁移到数据库规则表，<code>customRiskKeywords</code> 改为后端 API 读写，前端无需改动分析逻辑。</li>'
    + '<li><strong>可解释性：</strong>自定义关键词命中后，AI 结果和可解释规则说明中均标注"命中自定义规则关键词"，便于回溯规则来源。</li>'
    + '</ul>'
    + '</div>'
    + '<div class="card">'
    + '<h3>版本迭代记录</h3>'
    + '<div class="table-wrap"><table><thead><tr><th>版本</th><th>内容</th></tr></thead><tbody>'
    + '<tr><td>V0.1</td><td>完成基础页面结构和导航</td></tr>'
    + '<tr><td>V0.2</td><td>完成报平安表单和本地数据存储</td></tr>'
    + '<tr><td>V0.3</td><td>完成 AI 风险识别与派单推荐</td></tr>'
    + '<tr><td>V0.4</td><td>完成人工复核和工单生成</td></tr>'
    + '<tr><td>V0.5</td><td>完成协同处理和管理驾驶舱</td></tr>'
    + '<tr><td>V1.0</td><td>整理文档、场景脚本和测试数据</td></tr>'
    + '<tr><td>V1.1</td><td>新增推荐责任主体、可解释规则、协同处理留痕、进度提示、安全防护、今日/累计指标</td></tr>'
    + '<tr><td>V1.2</td><td>首页重构为系统工作台，清退课堂演示内容</td></tr>'
    + '<tr><td>V1.3</td><td>页面业务化表达优化，去除演示/示例用语</td></tr>'
    + '<tr><td>V1.4</td><td>表单字段完整性优化，新增服务等级/回访/处理方式</td></tr>'
    + '<tr><td>V1.5</td><td>角色权限与页面入口优化，六角色差异化首页</td></tr>'
    + '<tr><td>V1.6</td><td>风险规则可配置，支持自定义关键词增删</td></tr>'
    + '<tr><td>V1.7</td><td>工单处理时间线与闭环状态追踪</td></tr>'
    + '<tr><td>V1.8</td><td>AI 可信度分级展示与人工纠错机制</td></tr>'
    + '<tr><td>V1.9</td><td>隐私保护、数据脱敏与审计日志</td></tr>'
    + '</tbody></table></div>'
    + '</div>'
    + '</div>';
}

/* ============================
   模块 11：规则配置
   ============================ */

function renderRuleConfigPage() {
  var container = document.getElementById('ruleConfigSection');
  if (!container) return;
  var state = getStateSafe();
  var custom = state.customRiskKeywords || {};

  var categories = [
    { key: 'high', label: '高风险关键词', defaults: RISK_KEYWORDS.high },
    { key: 'medium', label: '中风险关键词', defaults: RISK_KEYWORDS.medium },
    { key: 'health', label: '健康类关键词', defaults: RISK_KEYWORDS.health },
    { key: 'maintenance', label: '维修类关键词', defaults: RISK_KEYWORDS.maintenance },
    { key: 'life', label: '生活服务类关键词', defaults: RISK_KEYWORDS.life },
    { key: 'companion', label: '陪诊类关键词', defaults: RISK_KEYWORDS.companion }
  ];

  var html = '<h2 class="section-title">风险规则配置</h2>';

  // 新增关键词区域
  html += '<div class="card">'
    + '<div class="card-title">新增自定义规则关键词</div>'
    + '<div class="form-row" style="align-items:flex-end">'
    + '<div class="form-group">'
    + '<label>规则类型</label>'
    + '<select id="customKeywordCategory" class="form-control">';
  categories.forEach(function(c) {
    html += '<option value="' + c.key + '">' + c.label + '</option>';
  });
  html += '</select></div>'
    + '<div class="form-group">'
    + '<label>关键词</label>'
    + '<input type="text" id="customKeywordText" class="form-control" placeholder="输入关键词，如：无法起身">'
    + '</div>'
    + '<div class="form-group">'
    + '<button class="btn btn-primary" onclick="addCustomKeyword()">新增规则关键词</button>'
    + '</div>'
    + '</div>'
    + '</div>';

  // 各规则分类表格
  categories.forEach(function(cat) {
    var customs = (custom[cat.key] && Array.isArray(custom[cat.key])) ? custom[cat.key] : [];
    var allKeywords = (cat.defaults || []).concat(customs);

    html += '<div class="card">'
      + '<div class="card-title">' + cat.label + '（共 ' + allKeywords.length + ' 个，其中自定义 ' + customs.length + ' 个）</div>'
      + '<div class="keyword-tags">';
    allKeywords.forEach(function(kw) {
      var isCustom = (customs.indexOf(kw) !== -1);
      if (isCustom) {
        // 安全地将关键词作为 JS 字符串参数传递
        var kwEscaped = kw.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        html += '<span class="keyword-tag keyword-custom">'
          + escapeHtml(kw)
          + '<button class="keyword-del" onclick="deleteCustomKeyword(\'' + cat.key + '\',\'' + kwEscaped + '\')" title="删除自定义关键词">×</button>'
          + '</span>';
      } else {
        html += '<span class="keyword-tag keyword-default">' + escapeHtml(kw) + '</span>';
      }
    });
    html += '</div></div>';
  });

  // 说明卡片
  html += '<div class="card">'
    + '<div class="card-title">规则说明</div>'
    + '<ul style="padding-left:20px;font-size:14px;color:var(--gray-700);line-height:2">'
    + '<li>默认规则来自 <code>data.js</code> 中的 <code>RISK_KEYWORDS</code>，系统启动时自动加载。</li>'
    + '<li>自定义规则存储在 <code>localStorage</code> 的 <code>customRiskKeywords</code> 字段中。</li>'
    + '<li>AI 分析时合并默认规则与自定义规则共同生效。</li>'
    + '<li>后续接入真实后端时，规则可迁移到数据库规则表中，支持更灵活的配置与管理。</li>'
    + '<li>删除自定义关键词后立即生效，不影响默认规则。</li>'
    + '</ul>'
    + '</div>';

  container.innerHTML = html;
}

/* ============================
   角色选择
   ============================ */

/**
 * 检查是否修改了 AI 判断，控制修改原因字段的显示
 */
function checkAiModification() {
  var riskEl = document.getElementById('reviewRiskLevel');
  var typeEl = document.getElementById('reviewEventType');
  var reasonGroup = document.getElementById('correctionReasonGroup');
  var recordIdEl = document.getElementById('reviewRecordId');

  if (!riskEl || !typeEl || !reasonGroup || !recordIdEl) return;

  var state = getStateSafe();
  var recordId = recordIdEl.value;
  var record = null;
  for (var i = 0; i < state.careRecords.length; i++) {
    if (state.careRecords[i].id === recordId) { record = state.careRecords[i]; break; }
  }
  if (!record || !record.aiResult) return;

  var aiRisk = record.aiResult.riskLevel || '';
  var aiType = record.aiResult.eventType || '';
  var isModified = (aiRisk !== riskEl.value || aiType !== typeEl.value);

  reasonGroup.style.display = isModified ? 'block' : 'none';
}

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
  // 审计日志
  var orderId = window.currentProcessOrderId || 'UNKNOWN';
  addAuditLog('上传照片', '工单', orderId, '模拟上传现场照片');
}
