/**
 * app.js - 应用入口文件
 * 负责：初始化系统、绑定事件、协调各模块
 */

// 全局状态对象
window.appState = null;

/**
 * 初始化应用
 */
function initApp() {
  // 从 localStorage 加载数据，若无则使用初始数据
  var saved = getState();
  if (saved && saved.elders && saved.resources) {
    window.appState = saved;
  } else {
    window.appState = getInitialState();
    saveState(window.appState);
  }

  // 绑定导航事件
  bindNavigationEvents();

  // 渲染首页
  renderHome();

  // 显示首页
  showSection('homeSection');
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
      if (sectionId === 'aiDocSection') renderAIDocPage();
      if (sectionId === 'systemDocSection') renderSystemDocPage();
    });
  });
}

/* ============================
   提交报平安/求助记录
   ============================ */

function submitCareRecord() {
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
    status: statusSelect.value,
    requestType: document.getElementById('requestTypeSelect').value,
    description: document.getElementById('descText').value,
    deviceAlert: document.getElementById('deviceAlertSelect').value,
    reporterRole: document.getElementById('reporterRoleSelect').value,
    phone: document.getElementById('phoneInput').value || '',
    createdAt: getNow(),
    aiResult: null,
    reviewed: false,
    reviewRiskLevel: '',
    reviewEventType: '',
    reviewInfo: null,
    isAiModified: false
  };

  // 调用 AI 引擎分析
  var aiResult = analyzeRequest(record);
  record.aiResult = aiResult;

  // 更新老人最近状态
  elder.lastStatus = record.status;

  // 保存到 state
  state.careRecords.push(record);
  saveState(state);

  showToast('求助记录已提交，AI 识别完成', 'success');

  // 跳转到 AI 识别结果页面
  showSection('aiResultSection');
  renderAIResult();
}

/* ============================
   快速填充示例
   ============================ */

function fillExample(num) {
  // 先渲染表单确保元素存在
  renderElderForm();

  setTimeout(function() {
    if (num === 1) {
      // 示例 1：正常报平安 - 王奶奶
      setField('elderSelect', 'E001');
      onElderChange();
      setField('statusSelect', '正常');
      setField('requestTypeSelect', '无');
      setField('deviceAlertSelect', '无');
      setField('descText', '今天状态正常，已吃饭，无明显异常。');
      setField('reporterRoleSelect', '老人本人');
      setField('phoneInput', '13800000001');
    } else if (num === 2) {
      // 示例 2：中风险未报平安 - 李爷爷
      setField('elderSelect', 'E002');
      onElderChange();
      setField('statusSelect', '轻微不适');
      setField('requestTypeSelect', '健康');
      setField('deviceAlertSelect', '长时间未活动');
      setField('descText', '老人两天没有主动报平安，家属反馈最近有些头晕。');
      setField('reporterRoleSelect', '家属');
      setField('phoneInput', '13800000002');
    } else if (num === 3) {
      // 示例 3：高风险跌倒 - 张阿姨
      setField('elderSelect', 'E003');
      onElderChange();
      setField('statusSelect', '紧急求助');
      setField('requestTypeSelect', '健康');
      setField('deviceAlertSelect', '跌倒提醒');
      setField('descText', '老人跌倒，家属联系不上，情况比较紧急。');
      setField('reporterRoleSelect', '家属');
      setField('phoneInput', '13800000003');
    } else if (num === 4) {
      // 示例 4：维修类求助 - 陈爷爷
      setField('elderSelect', 'E004');
      onElderChange();
      setField('statusSelect', '正常');
      setField('requestTypeSelect', '维修');
      setField('deviceAlertSelect', '水浸提醒');
      setField('descText', '厨房漏水，需要维修人员上门处理。');
      setField('reporterRoleSelect', '老人本人');
      setField('phoneInput', '13800000004');
    }
    showToast('示例 ' + num + ' 已填充，可修改后提交', 'info');
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

  // 保存复核信息（同时保留 AI 原始结果）
  record.reviewed = true;
  record.reviewRiskLevel = reviewRiskLevel;
  record.reviewEventType = reviewEventType;
  record.isAiModified = isAiModified;
  record.reviewInfo = {
    riskLevel: reviewRiskLevel,
    eventType: reviewEventType,
    comment: reviewComment,
    reviewedAt: getNow(),
    aiRiskLevel: aiRiskLevel,
    aiEventType: aiEventType,
    isAiModified: isAiModified
  };

  if (generateOrder === 'yes') {
    // 生成工单
    var order = createWorkOrder(record, record.reviewInfo);
    state.workOrders.push(order);
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

  order.processRole = processRole;
  order.acceptedAt = getNow();
  updateWorkOrderStatus(order, '处理中');
  saveState(state);
  showToast('已接单，工单状态更新为"处理中"', 'success');
  renderCollaborationPage();
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
  saveState(state);
  showToast('工单已完成', 'success');
  renderCollaborationPage();
}

/* ============================
   数据管理操作
   ============================ */

function loadSampleData() {
  var state = getInitialState();
  var now = getNow();
  var today = getTodayStr();

  // 添加一条完整演示记录（高风险跌倒）
  var aiResult1 = {
    riskLevel: '高风险',
    eventType: '健康类',
    confidence: 0.95,
    reasons: ['今日状态为"紧急求助"', '设备触发"跌倒提醒"', '描述包含"跌倒、联系不上"'],
    suggestion: '立即派单，通知家属和社区医生，网格员同步上门核实。'
  };

  var record = {
    id: 'R' + Date.now() + '01',
    elderId: 'E003',
    elderName: '张阿姨',
    age: 68,
    address: '幸福社区 2 号楼 102',
    status: '紧急求助',
    requestType: '健康',
    description: '老人跌倒，家属联系不上，情况比较紧急。',
    deviceAlert: '跌倒提醒',
    reporterRole: '家属',
    phone: '13800000003',
    createdAt: now,
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
    completedAt: now,
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
    reasons: ['今日状态为"轻微不适"', '设备触发"长时间未活动"', '描述包含"未报平安、头晕"'],
    suggestion: '网格员电话核实，生成随访任务，必要时协调社区医生随访。'
  };

  var record2 = {
    id: 'R' + Date.now() + '02',
    elderId: 'E002',
    elderName: '李爷爷',
    age: 82,
    address: '幸福社区 5 号楼 301',
    status: '轻微不适',
    requestType: '健康',
    description: '老人两天没有主动报平安，家属反馈最近有些头晕。',
    deviceAlert: '长时间未活动',
    reporterRole: '家属',
    phone: '13800000002',
    createdAt: now,
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
  saveState(state);
  showToast('示例数据已载入', 'success');
  renderDataTables();
}

function clearAllData() {
  if (confirm('确定要清空所有演示数据吗？此操作不可恢复。')) {
    resetState();
    window.appState = getInitialState();
    saveState(window.appState);
    showToast('演示数据已清空', 'info');
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
    saveState(data);
    showToast('数据导入成功', 'success');
    document.getElementById('importDialog').innerHTML = '';
    renderDataTables();
  } else {
    showToast('JSON 结构不符合演示系统数据格式，导入失败', 'error');
  }
}

/* ============================
   页面加载时初始化
   ============================ */

document.addEventListener('DOMContentLoaded', function() {
  initApp();
});
