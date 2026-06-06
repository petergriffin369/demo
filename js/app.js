/**
 * app.js - 应用入口文件
 * 负责：初始化系统、绑定事件、协调各模块
 */

// 全局状态对象
window.appState = null;
// 隐私保护：是否显示完整信息
window.showFullInfo = false;

/* ============================
   数据脱敏函数
   ============================ */

/**
 * 脱敏电话：138****0001
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string' || phone.length < 7) return phone || '';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

/**
 * 脱敏地址：幸福社区 3 号楼 ***
 */
function maskAddress(address) {
  if (!address || typeof address !== 'string') return address || '';
  // 匹配房号模式（数字结尾或数字+号结尾）
  var match = address.match(/^(.+?(?:号楼|栋|幢|单元)\s*)(\d+.*)$/);
  if (match) {
    return match[1] + '***';
  }
  // 无明确房号时，隐藏最后一段
  var lastSpace = address.lastIndexOf(' ');
  if (lastSpace > 0 && /\d/.test(address.substring(lastSpace))) {
    return address.substring(0, lastSpace) + ' ***';
  }
  return address;
}

/**
 * 脱敏紧急联系人：王女士 138****0001
 */
function maskEmergencyContact(contact) {
  if (!contact || typeof contact !== 'string') return contact || '';
  // 分离姓名和电话
  var match = contact.match(/^(.+?)\s*(\d{7,})$/);
  if (match) {
    return match[1] + ' ' + maskPhone(match[2]);
  }
  // 如果包含连续数字则脱敏数字部分
  return contact.replace(/(\d{3})\d{4,}(\d{4})/g, '$1****$2');
}

/**
 * 根据隐私开关返回脱敏或原始值
 */
function privacyValue(original, maskFn) {
  if (window.showFullInfo) return original;
  return maskFn(original);
}

/**
 * 切换隐私显示
 */
function togglePrivacy() {
  if (!window.showFullInfo) {
    if (confirm('完整信息仅限授权人员查看，是否继续？')) {
      window.showFullInfo = true;
      var btn = document.getElementById('privacyToggleBtn');
      if (btn) btn.innerHTML = '🔓 恢复脱敏显示';
      showToast('完整信息已临时显示，刷新页面后恢复脱敏', 'warning');
      refreshCurrentPage();
    }
  } else {
    window.showFullInfo = false;
    var btn = document.getElementById('privacyToggleBtn');
    if (btn) btn.innerHTML = '🔒 显示完整信息';
    showToast('已恢复脱敏显示', 'info');
    refreshCurrentPage();
  }
}

/**
 * 刷新当前显示的页面
 */
function refreshCurrentPage() {
  var activeSection = document.querySelector('.section.active');
  if (!activeSection) { renderHome(); return; }
  var sectionId = activeSection.id;
  if (sectionId === 'homeSection') renderHome();
  if (sectionId === 'elderFormSection') renderElderForm();
  if (sectionId === 'aiResultSection') renderAIResult();
  if (sectionId === 'reviewSection') renderReviewPage();
  if (sectionId === 'workOrderSection') renderWorkOrderPage();
  if (sectionId === 'collaborationSection') renderCollaborationPage();
  if (sectionId === 'dashboardSection') renderDashboard();
  if (sectionId === 'dataSection') renderDataTables();
  if (sectionId === 'ruleConfigSection') renderRuleConfigPage();
  if (sectionId === 'aiDocSection') renderAIDocPage();
  if (sectionId === 'systemDocSection') renderSystemDocPage();
}

/* ============================
   审计日志
   ============================ */

/**
 * 写入审计日志
 * @param {string} action 操作类型
 * @param {string} targetType 对象类型
 * @param {string} targetId 对象编号
 * @param {string} detail 操作说明
 */
function addAuditLog(action, targetType, targetId, detail) {
  if (!window.appState) return;
  if (!window.appState.auditLogs) {
    window.appState.auditLogs = [];
  }
  var log = {
    logId: 'LOG' + Date.now() + Math.random().toString(36).substring(2, 6),
    action: action,
    operatorRole: window.appState.currentRole || '未知',
    targetType: targetType,
    targetId: targetId,
    detail: detail,
    createdAt: getNow()
  };
  window.appState.auditLogs.push(log);
  // 限制日志数量，保留最新 500 条
  if (window.appState.auditLogs.length > 500) {
    window.appState.auditLogs = window.appState.auditLogs.slice(-500);
  }
}

/**
 * 初始化应用
 */
function initApp() {
  // 从 localStorage 加载数据，若无则使用初始数据
  var saved = getState();
  if (saved && saved.elders && saved.resources) {
    window.appState = saved;
    // 兼容旧数据：如果没有 currentRole 字段，设置默认值
    if (!window.appState.currentRole) {
      window.appState.currentRole = '网格员';
    }
    // 兼容旧数据：如果没有 customRiskKeywords 字段，初始化
    if (!window.appState.customRiskKeywords) {
      window.appState.customRiskKeywords = {
        high: [], medium: [], health: [], maintenance: [], life: [], companion: []
      };
    }
    // 兼容旧数据：如果没有 auditLogs 字段，初始化
    if (!window.appState.auditLogs) {
      window.appState.auditLogs = [];
    }
    if (!window.appState.currentRole || !window.appState.customRiskKeywords || !window.appState.auditLogs) {
      saveState(window.appState);
    }
  } else {
    window.appState = getInitialState();
    saveState(window.appState);
  }

  // 同步角色选择器
  syncRoleSelector();

  // 绑定导航事件
  bindNavigationEvents();

  // 渲染首页
  renderHome();

  // 显示首页
  showSection('homeSection');
}

/**
 * 角色切换处理
 */
function onRoleChange() {
  var selector = document.getElementById('roleSelector');
  if (!selector) return;
  window.appState.currentRole = selector.value;
  saveState(window.appState);
  // 重新渲染首页以更新快捷入口
  renderHome();
  showToast('当前角色已切换为：' + selector.value, 'info');
}

/**
 * 同步角色选择器与 state 中的当前角色
 */
function syncRoleSelector() {
  var selector = document.getElementById('roleSelector');
  if (selector && window.appState && window.appState.currentRole) {
    selector.value = window.appState.currentRole;
  }
}

/**
 * 绑定顶部导航点击事件
 */
function bindNavigationEvents() {
  var navLinks = document.querySelectorAll('.header-nav a');
  navLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var sectionId = this.getAttribute('data-section');
      showSection(sectionId);

      // 切换时渲染对应页面
      if (sectionId === 'homeSection') renderHome();
      if (sectionId === 'elderFormSection') renderElderForm();
      if (sectionId === 'aiResultSection') renderAIResult();
      if (sectionId === 'reviewSection') renderReviewPage();
      if (sectionId === 'workOrderSection') renderWorkOrderPage();
      if (sectionId === 'collaborationSection') renderCollaborationPage();
      if (sectionId === 'dashboardSection') renderDashboard();
      if (sectionId === 'dataSection') renderDataTables();
      if (sectionId === 'ruleConfigSection') renderRuleConfigPage();
      if (sectionId === 'aiDocSection') renderAIDocPage();
      if (sectionId === 'systemDocSection') renderSystemDocPage();
    });
  });
}

/* ============================
   提交报平安/求助记录
   ============================ */

async function submitCareRecord() {
  var elderSelect = document.getElementById('elderSelect');
  var statusSelect = document.getElementById('statusSelect');

  if (!elderSelect.value) {
    showToast('请选择老人', 'warning');
    return;
  }
  if (!statusSelect.value) {
    showToast('请选择今日状态', 'warning');
    return;
  }

  var state = window.appState;
  var elder = state.elders.find(function(e) { return e.id === elderSelect.value; });
  if (!elder) {
    showToast('未找到对应老人信息', 'error');
    return;
  }

  // 构建求助记录
  var record = {
    id: 'R' + Date.now(),
    elderId: elder.id,
    elderName: elder.name,
    age: elder.age,
    address: elder.address,
    healthTags: elder.healthTags || [],
    emergencyContact: elder.emergencyContact || '',
    serviceLevel: elder.serviceLevel || '',
    status: statusSelect.value,
    requestType: document.getElementById('requestTypeSelect').value,
    description: document.getElementById('descText').value,
    deviceAlert: document.getElementById('deviceAlertSelect').value,
    reporterRole: document.getElementById('reporterRoleSelect').value,
    phone: document.getElementById('phoneInput').value || '',
    needFollowUp: document.getElementById('needFollowUpSelect').value,
    handlingMethod: document.getElementById('handlingMethodSelect').value,
    createdAt: getNow(),
    aiResult: null,
    reviewed: false,
    reviewRiskLevel: '',
    reviewEventType: '',
    reviewInfo: null,
    isAiModified: false
  };

  // 调用 AI 引擎分析（优先 DeepSeek LLM，失败自动兜底）
  showToast('正在调用 DeepSeek 大语言模型进行风险识别...', 'info');
  var aiResult = await analyzeRequestDefault(record);
  record.aiResult = aiResult;
  record.aiAnalyzedAt = getNow();

  // 根据是否回退显示不同提示
  if (aiResult.fallback === true) {
    showToast('DeepSeek 调用失败，已使用规则引擎兜底', 'warning');
  } else {
    showToast('DeepSeek 大语言模型识别完成', 'success');
  }

  // 更新老人最近状态
  elder.lastStatus = record.status;

  // 保存到 state
  state.careRecords.push(record);
  addAuditLog('提交求助', '求助记录', record.id, '老人：' + record.elderName + '，状态：' + record.status);
  addAuditLog('AI 识别', '求助记录', record.id, '风险等级：' + aiResult.riskLevel + '，置信度：' + Math.round(aiResult.confidence * 100) + '%' + '，AI模式：' + (aiResult.aiModeUsed || 'unknown'));
  saveState(state);

  // 跳转到 AI 识别结果页面
  showSection('aiResultSection');
  renderAIResult();
}

/* ============================
   快速填充场景
   ============================ */

function fillExample(num) {
  // 先渲染表单确保元素存在
  renderElderForm();

  setTimeout(function() {
    if (num === 1) {
      // 场景 1：正常报平安 - 王奶奶
      setField('elderSelect', 'E001');
      onElderChange();
      setField('statusSelect', '正常');
      setField('requestTypeSelect', '无');
      setField('deviceAlertSelect', '无');
      setField('descText', '今天状态正常，已吃饭，无明显异常。');
      setField('reporterRoleSelect', '老人本人');
      setField('phoneInput', '13800000001');
      setField('needFollowUpSelect', '否');
      setField('handlingMethodSelect', '仅记录');
    } else if (num === 2) {
      // 场景 2：未报平安核实 - 李爷爷
      setField('elderSelect', 'E002');
      onElderChange();
      setField('statusSelect', '轻微不适');
      setField('requestTypeSelect', '健康');
      setField('deviceAlertSelect', '长时间未活动');
      setField('descText', '老人两天没有主动报平安，家属反馈最近有些头晕。');
      setField('reporterRoleSelect', '家属');
      setField('phoneInput', '13800000002');
      setField('needFollowUpSelect', '是');
      setField('handlingMethodSelect', '电话核实');
    } else if (num === 3) {
      // 场景 3：跌倒紧急求助 - 张阿姨
      setField('elderSelect', 'E003');
      onElderChange();
      setField('statusSelect', '紧急求助');
      setField('requestTypeSelect', '健康');
      setField('deviceAlertSelect', '跌倒提醒');
      setField('descText', '老人跌倒，家属联系不上，情况比较紧急。');
      setField('reporterRoleSelect', '家属');
      setField('phoneInput', '13800000003');
      setField('needFollowUpSelect', '是');
      setField('handlingMethodSelect', '生成工单');
    } else if (num === 4) {
      // 场景 4：居家维修求助 - 陈爷爷
      setField('elderSelect', 'E004');
      onElderChange();
      setField('statusSelect', '正常');
      setField('requestTypeSelect', '维修');
      setField('deviceAlertSelect', '水浸提醒');
      setField('descText', '厨房漏水，需要维修人员上门处理。');
      setField('reporterRoleSelect', '老人本人');
      setField('phoneInput', '13800000004');
      setField('needFollowUpSelect', '否');
      setField('handlingMethodSelect', '生成工单');
    }
    showToast('场景 ' + num + ' 已填充，可修改后提交', 'info');
  }, 50);
}

function setField(id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value;
}

/* ============================
   提交复核
   ============================ */

function submitReview() {
  var recordId = document.getElementById('reviewRecordId').value;
  var reviewRiskLevel = document.getElementById('reviewRiskLevel').value;
  var reviewEventType = document.getElementById('reviewEventType').value;
  var reviewComment = document.getElementById('reviewComment').value;
  var generateOrder = document.getElementById('generateOrder').value;

  var state = window.appState;
  var recordIdx = -1;
  var record = null;
  for (var i = 0; i < state.careRecords.length; i++) {
    if (state.careRecords[i].id === recordId) {
      recordIdx = i;
      record = state.careRecords[i];
      break;
    }
  }
  if (!record) {
    showToast('未找到对应记录', 'error');
    return;
  }

  // 判断是否中风险或高风险
  var isMediumOrHigh = (reviewRiskLevel === '中风险' || reviewRiskLevel === '高风险');

  // 如果复核后仍为中/高风险，但用户选择不生成工单，弹出二次确认
  if (isMediumOrHigh && generateOrder === 'no') {
    if (!confirm('当前为中/高风险，建议生成工单。确定仅留痕吗？')) {
      return;
    }
  }

  // 判断 AI 是否被人工修改
  var aiRiskLevel = record.aiResult ? record.aiResult.riskLevel : '';
  var aiEventType = record.aiResult ? record.aiResult.eventType : '';
  var isAiModified = (aiRiskLevel !== reviewRiskLevel || aiEventType !== reviewEventType);

  // 如果修改了 AI 判断，必须填写修改原因
  var correctionReason = '';
  if (isAiModified) {
    var reasonEl = document.getElementById('correctionReason');
    correctionReason = reasonEl ? reasonEl.value.trim() : '';
    if (!correctionReason) {
      showToast('修改了 AI 判断结果，必须填写修改原因', 'warning');
      return;
    }
  }

  // 保存复核信息（同时保留 AI 原始结果）
  record.reviewed = true;
  record.reviewRiskLevel = reviewRiskLevel;
  record.reviewEventType = reviewEventType;
  record.isAiModified = isAiModified;
  record.correctionReason = correctionReason;
  record.reviewInfo = {
    riskLevel: reviewRiskLevel,
    eventType: reviewEventType,
    comment: reviewComment,
    reviewedAt: getNow(),
    aiRiskLevel: aiRiskLevel,
    aiEventType: aiEventType,
    isAiModified: isAiModified,
    correctionReason: correctionReason
  };

  if (generateOrder === 'yes') {
    // 生成工单
    var order = createWorkOrder(record, record.reviewInfo);
    state.workOrders.push(order);
    addAuditLog('人工复核', '求助记录', record.id, '复核风险：' + reviewRiskLevel + (isAiModified ? '（已修改AI判断，原因：' + correctionReason + '）' : '（确认AI判断）'));
    addAuditLog('生成工单', '工单', order.id, '风险：' + order.riskLevel + '，责任人：' + order.assignee);
    saveState(state);
    showToast('复核完成，工单已生成', 'success');
    // 跳转到工单调度
    showSection('workOrderSection');
    renderWorkOrderPage();
    // 自动展示该工单详情
    setTimeout(function() {
      showWorkOrderDetail(order.id);
    }, 200);
  } else {
    // 仅留痕
    addAuditLog('人工复核', '求助记录', record.id, '复核风险：' + reviewRiskLevel + '，仅留痕不生成工单' + (isAiModified ? '（已修改AI判断，原因：' + correctionReason + '）' : ''));
    saveState(state);
    showToast('复核完成，已留痕，不生成工单', 'info');
    showSection('aiResultSection');
    renderAIResult();
  }
}

/* ============================
   工单操作
   ============================ */

function confirmAssign(orderId) {
  var state = window.appState;
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  assignWorkOrder(order, order.assignee, '');
  addAuditLog('确认派单', '工单', order.id, '责任人：' + order.assignee);
  saveState(state);
  showToast('工单已派单', 'success');
  renderWorkOrderPage();
  showWorkOrderDetail(orderId);
}

function showReassignForm(orderId) {
  var state = window.appState;
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  var form = document.getElementById('reassignForm' + orderId);
  if (!form) return;

  var resourceOptions = state.resources.map(function(r) {
    return '<option value="' + r.name + '（' + r.role + '）">' + r.name + '（' + r.role + '）</option>';
  }).join('');

  form.style.display = 'block';
  form.innerHTML = ''
    + '<div style="padding:16px;background:var(--gray-50);border-radius:8px;">'
    + '<strong>改派责任人</strong>'
    + '<div class="form-row" style="margin-top:8px;">'
    + '<div class="form-group">'
    + '<label>新责任人</label>'
    + '<select id="reassignTo' + orderId + '" class="form-control">'
    + '<option value="社区医生 + 网格员">社区医生 + 网格员</option>'
    + '<option value="网格员">网格员</option>'
    + '<option value="物业/维修人员">物业/维修人员</option>'
    + '<option value="志愿者">志愿者</option>'
    + '<option value="志愿者 + 家属确认">志愿者 + 家属确认</option>'
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>改派原因 <span class="required">*</span></label>'
    + '<input type="text" id="reassignReason' + orderId + '" class="form-control" placeholder="请填写改派原因" required>'
    + '</div>'
    + '</div>'
    + '<div class="btn-group">'
    + '<button class="btn btn-primary" onclick="doReassign(\'' + orderId + '\')">确认改派</button>'
    + '<button class="btn btn-outline" onclick="this.closest(\'div\').parentElement.style.display=\'none\'">取消</button>'
    + '</div>'
    + '</div>';
}

function doReassign(orderId) {
  var newAssignee = document.getElementById('reassignTo' + orderId).value;
  var reason = document.getElementById('reassignReason' + orderId).value;
  if (!reason) {
    showToast('请填写改派原因', 'warning');
    return;
  }
  var state = window.appState;
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  assignWorkOrder(order, newAssignee, reason);
  addAuditLog('改派责任人', '工单', order.id, '从 ' + order.reassignHistory[order.reassignHistory.length - 1].from + ' 改为 ' + newAssignee + '，原因：' + reason);
  saveState(state);
  showToast('责任人已改派', 'success');
  renderWorkOrderPage();
  showWorkOrderDetail(orderId);
}

/* ============================
   协同处理操作
   ============================ */

function acceptOrder(orderId) {
  var state = window.appState;
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;

  // 获取当前选中的处理角色
  var selectedRole = document.querySelector('.role-option.selected');
  var processRole = selectedRole ? selectedRole.getAttribute('data-role') : '网格员';

  // 角色与工单类型匹配检查
  var currentRole = state.currentRole || '网格员';
  var mismatchMsg = getRoleMismatchWarning(currentRole, order.eventType);
  if (mismatchMsg) {
    if (!confirm(mismatchMsg + '\n\n当前角色可能不是推荐责任主体，请确认是否继续处理。')) {
      return;
    }
  }

  order.processRole = processRole;
  order.acceptedAt = getNow();
  updateWorkOrderStatus(order, '处理中');
  addAuditLog('接单处理', '工单', order.id, '处理角色：' + processRole);
  saveState(state);
  showToast('已接单，工单状态更新为"处理中"', 'success');
  renderCollaborationPage();
}

/**
 * 检查当前角色是否与工单事件类型匹配
 * @param {string} role 当前角色
 * @param {string} eventType 工单事件类型
 * @returns {string|null} 不匹配时返回提示信息，匹配时返回 null
 */
function getRoleMismatchWarning(role, eventType) {
  // 网格员和社区管理者可以处理所有类型
  if (role === '网格员' || role === '社区管理者') return null;
  // 老人/家属不应处理工单
  if (role === '老人/家属') return '当前角色为老人/家属，通常不直接处理工单。';
  // 社区医生匹配健康类
  if (role === '社区医生' && eventType !== '健康类') return '当前角色为社区医生，但工单类型为' + eventType + '。';
  // 物业/维修人员匹配维修类
  if (role === '物业/维修人员' && eventType !== '维修类') return '当前角色为物业/维修人员，但工单类型为' + eventType + '。';
  // 志愿者匹配生活服务类和陪诊类
  if (role === '志愿者' && eventType !== '生活服务类' && eventType !== '陪诊类') return '当前角色为志愿者，但工单类型为' + eventType + '。';
  return null;
}

function finishOrder(orderId) {
  var state = window.appState;
  var order = state.workOrders.find(function(o) { return o.id === orderId; });
  if (!order) return;

  var result = document.getElementById('processResult').value;
  var rating = document.getElementById('processRating').value;
  var ratingComment = document.getElementById('processRatingComment').value;

  if (!result) {
    showToast('请填写处理结果', 'warning');
    return;
  }

  // 检查是否已模拟上传照片
  var uploadBtn = document.getElementById('fakeUploadBtn');
  var photoUploaded = uploadBtn ? uploadBtn.classList.contains('done') : false;

  completeWorkOrder(order, result, rating, ratingComment, photoUploaded);
  addAuditLog('完成工单', '工单', order.id, '处理结果：' + result.substring(0, 30) + '...，评价：' + rating);
  saveState(state);
  showToast('工单已完成', 'success');
  renderCollaborationPage();
}

/* ============================
   数据管理操作
   ============================ */

function loadSampleData() {
  // 保留当前角色设置
  var savedRole = (window.appState && window.appState.currentRole) ? window.appState.currentRole : '网格员';
  var state = getInitialState();
  state.currentRole = savedRole;
  var now = getNow();
  var today = getTodayStr();

  // 添加一条完整场景记录（高风险跌倒）
  var aiResult1 = {
    riskLevel: '高风险',
    eventType: '健康类',
    confidence: 0.95,
    reasons: ['今日状态为"紧急求助"', '设备触发"跌倒提醒"', '描述包含"跌倒、联系不上"', '老人属于重点关注对象'],
    suggestion: '立即派单，通知家属和社区医生，网格员同步上门核实。建议安排后续回访。',
    assignee: '社区医生 + 网格员',
    deadline: '30 分钟内响应',
    modelProvider: 'DeepSeek',
    modelName: 'deepseek-chat',
    aiModeUsed: 'llm',
    fallback: false,
    privacyProtected: true
  };

  var record = {
    id: 'R' + Date.now() + '01',
    elderId: 'E003',
    elderName: '张阿姨',
    age: 68,
    address: '幸福社区 2 号楼 102',
    healthTags: ['独居', '行动不便'],
    emergencyContact: '张先生 13800000003',
    serviceLevel: '重点关注',
    status: '紧急求助',
    requestType: '健康',
    description: '老人跌倒，家属联系不上，情况比较紧急。',
    deviceAlert: '跌倒提醒',
    reporterRole: '家属',
    phone: '13800000003',
    needFollowUp: '是',
    handlingMethod: '生成工单',
    createdAt: now,
    aiAnalyzedAt: now,
    aiResult: aiResult1,
    reviewed: true,
    reviewRiskLevel: '高风险',
    reviewEventType: '健康类',
    isAiModified: false,
    reviewInfo: {
      riskLevel: '高风险',
      eventType: '健康类',
      comment: '情况紧急，需立即上门核实。',
      reviewedAt: now,
      aiRiskLevel: '高风险',
      aiEventType: '健康类',
      isAiModified: false
    }
  };
  state.careRecords.push(record);

  var recommend1 = recommendAssignee('健康类', '高风险');
  var order = {
    id: 'WO' + Date.now() + '01',
    recordId: record.id,
    elderId: 'E003',
    elderName: '张阿姨',
    address: '幸福社区 2 号楼 102',
    riskLevel: '高风险',
    eventType: '健康类',
    aiReasons: aiResult1.reasons,
    aiRiskLevel: '高风险',
    aiEventType: '健康类',
    reviewRiskLevel: '高风险',
    reviewEventType: '健康类',
    reviewComment: '情况紧急，需立即上门核实。',
    assignee: recommend1.assignee,
    originalAssignee: recommend1.assignee,
    deadline: recommend1.deadline,
    status: '已完成',
    result: '已电话联系家属，网格员上门核实，社区医生同步随访，老人目前意识清楚，已建议家属陪同就医。',
    rating: '满意',
    ratingComment: '响应很快，处理及时',
    processRole: '网格员',
    acceptedAt: now,
    assignedAt: now,
    completedAt: now,
    ratingAt: now,
    photoUploaded: true,
    reassignHistory: [],
    createdAt: now,
    updatedAt: now
  };
  state.workOrders.push(order);

  // 添加一条中风险记录
  var aiResult2 = {
    riskLevel: '中风险',
    eventType: '健康类',
    confidence: 0.78,
    reasons: ['今日状态为"轻微不适"', '设备触发"长时间未活动"', '描述包含"未报平安、头晕"', '老人属于重点关注对象'],
    suggestion: '网格员电话核实，生成随访任务，必要时协调社区医生随访。建议安排后续回访。',
    assignee: '网格员（电话核实），必要时社区医生随访',
    deadline: '2 小时内响应',
    modelProvider: 'DeepSeek',
    modelName: 'deepseek-chat',
    aiModeUsed: 'llm',
    fallback: false,
    privacyProtected: true
  };

  var record2 = {
    id: 'R' + Date.now() + '02',
    elderId: 'E002',
    elderName: '李爷爷',
    age: 82,
    address: '幸福社区 5 号楼 301',
    healthTags: ['高龄', '空巢', '高血压'],
    emergencyContact: '李先生 13800000002',
    serviceLevel: '重点关注',
    status: '轻微不适',
    requestType: '健康',
    description: '老人两天没有主动报平安，家属反馈最近有些头晕。',
    deviceAlert: '长时间未活动',
    reporterRole: '家属',
    phone: '13800000002',
    needFollowUp: '是',
    handlingMethod: '电话核实',
    createdAt: now,
    aiAnalyzedAt: now,
    aiResult: aiResult2,
    reviewed: true,
    reviewRiskLevel: '中风险',
    reviewEventType: '健康类',
    isAiModified: false,
    reviewInfo: {
      riskLevel: '中风险',
      eventType: '健康类',
      comment: '已电话联系，建议社区医生两天内上门随访。',
      reviewedAt: now,
      aiRiskLevel: '中风险',
      aiEventType: '健康类',
      isAiModified: false
    }
  };
  state.careRecords.push(record2);

  var recommend2 = recommendAssignee('健康类', '中风险');
  var order2 = {
    id: 'WO' + Date.now() + '02',
    recordId: record2.id,
    elderId: 'E002',
    elderName: '李爷爷',
    address: '幸福社区 5 号楼 301',
    riskLevel: '中风险',
    eventType: '健康类',
    aiReasons: aiResult2.reasons,
    aiRiskLevel: '中风险',
    aiEventType: '健康类',
    reviewRiskLevel: '中风险',
    reviewEventType: '健康类',
    reviewComment: '已电话联系，建议社区医生两天内上门随访。',
    assignee: recommend2.assignee,
    originalAssignee: recommend2.assignee,
    deadline: recommend2.deadline,
    status: '已派单',
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
  state.workOrders.push(order2);

  window.appState = state;
  addAuditLog('载入场景数据', '系统', 'SAMPLE', '载入 2 条预设记录和工单');
  saveState(state);
  showToast('场景数据已载入', 'success');
  renderDataTables();
}

function clearAllData() {
  if (confirm('此操作将清空所有业务数据和审计日志，是否继续？')) {
    addAuditLog('清空数据', '系统', 'ALL', '清空前共 ' + (window.appState.careRecords || []).length + ' 条记录、' + (window.appState.workOrders || []).length + ' 条工单、' + (window.appState.auditLogs || []).length + ' 条日志');
    resetState();
    window.appState = getInitialState();
    saveState(window.appState);
    showToast('业务数据已清空', 'info');
    renderDataTables();
  }
}

function downloadJSON() {
  var json = exportData(window.appState);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'eldercare_data_' + getTodayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addAuditLog('导出数据', '系统', 'EXPORT', '导出 ' + (window.appState.careRecords || []).length + ' 条记录、' + (window.appState.workOrders || []).length + ' 条工单');
  showToast('数据已导出下载', 'success');
}

function doImport() {
  var text = document.getElementById('importJsonText').value;
  if (!text) {
    showToast('请粘贴 JSON 数据', 'warning');
    return;
  }
  var data = importData(text);
  if (data && data.elders && data.resources && data.careRecords && data.workOrders) {
    window.appState = data;
    addAuditLog('导入数据', '系统', 'IMPORT', '导入 ' + (data.careRecords || []).length + ' 条记录、' + (data.workOrders || []).length + ' 条工单');
    saveState(data);
    showToast('数据导入成功', 'success');
    document.getElementById('importDialog').innerHTML = '';
    renderDataTables();
  } else {
    showToast('JSON 结构不符合系统数据格式，导入失败', 'error');
  }
}

/* ============================
   规则配置操作
   ============================ */

/**
 * 新增自定义关键词
 */
function addCustomKeyword() {
  var categorySelect = document.getElementById('customKeywordCategory');
  var keywordInput = document.getElementById('customKeywordText');
  if (!categorySelect || !keywordInput) return;

  var category = categorySelect.value;
  var keyword = keywordInput.value.trim();

  if (!keyword) {
    showToast('请输入关键词', 'warning');
    return;
  }

  // 确保 state 中有 customRiskKeywords
  if (!window.appState.customRiskKeywords) {
    window.appState.customRiskKeywords = {
      high: [], medium: [], health: [], maintenance: [], life: [], companion: []
    };
  }

  // 检查是否已存在于默认规则中
  if (RISK_KEYWORDS[category] && RISK_KEYWORDS[category].indexOf(keyword) !== -1) {
    showToast('该关键词已存在于默认规则中', 'warning');
    return;
  }

  // 检查是否已存在于自定义规则中
  var customs = window.appState.customRiskKeywords[category] || [];
  if (customs.indexOf(keyword) !== -1) {
    showToast('该关键词已存在于自定义规则中', 'warning');
    return;
  }

  customs.push(keyword);
  window.appState.customRiskKeywords[category] = customs;
  saveState(window.appState);
  showToast('自定义关键词"' + keyword + '"已添加至' + getCategoryLabel(category), 'success');
  renderRuleConfigPage();
}

/**
 * 删除自定义关键词
 * @param {string} category 规则分类
 * @param {string} keyword 关键词
 */
function deleteCustomKeyword(category, keyword) {
  if (!window.appState.customRiskKeywords) return;
  var customs = window.appState.customRiskKeywords[category] || [];
  var idx = customs.indexOf(keyword);
  if (idx === -1) return;

  customs.splice(idx, 1);
  window.appState.customRiskKeywords[category] = customs;
  saveState(window.appState);
  showToast('自定义关键词"' + keyword + '"已删除', 'info');
  renderRuleConfigPage();
}

/**
 * 获取分类中文标签
 */
function getCategoryLabel(category) {
  var map = {
    high: '高风险关键词',
    medium: '中风险关键词',
    health: '健康类关键词',
    maintenance: '维修类关键词',
    life: '生活服务类关键词',
    companion: '陪诊类关键词'
  };
  return map[category] || category;
}

/* ============================
   页面加载时初始化
   ============================ */

document.addEventListener('DOMContentLoaded', function() {
  initApp();
});
