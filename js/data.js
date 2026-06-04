/**
 * data.js - 初始模拟数据定义
 * 包含：老人档案、人员资源、风险规则关键词
 */

/**
 * 老人档案数据
 */
const INITIAL_ELDERS = [
  {
    id: 'E001',
    name: '王奶奶',
    age: 78,
    address: '幸福社区 3 号楼 502',
    healthTags: ['高龄', '独居', '慢病'],
    emergencyContact: '王女士 13800000001',
    serviceLevel: '重点关注',
    lastStatus: '正常'
  },
  {
    id: 'E002',
    name: '李爷爷',
    age: 82,
    address: '幸福社区 5 号楼 301',
    healthTags: ['高龄', '空巢', '高血压'],
    emergencyContact: '李先生 13800000002',
    serviceLevel: '重点关注',
    lastStatus: '正常'
  },
  {
    id: 'E003',
    name: '张阿姨',
    age: 68,
    address: '幸福社区 2 号楼 102',
    healthTags: ['独居', '行动不便'],
    emergencyContact: '张先生 13800000003',
    serviceLevel: '重点关注',
    lastStatus: '正常'
  },
  {
    id: 'E004',
    name: '陈爷爷',
    age: 75,
    address: '幸福社区 7 号楼 201',
    healthTags: ['慢病', '独居'],
    emergencyContact: '陈女士 13800000004',
    serviceLevel: '常规关注',
    lastStatus: '正常'
  },
  {
    id: 'E005',
    name: '刘奶奶',
    age: 85,
    address: '幸福社区 1 号楼 401',
    healthTags: ['高龄', '空巢', '心脏病'],
    emergencyContact: '刘先生 13800000005',
    serviceLevel: '重点关注',
    lastStatus: '正常'
  },
  {
    id: 'E006',
    name: '赵伯伯',
    age: 72,
    address: '幸福社区 4 号楼 602',
    healthTags: ['高血压', '独居'],
    emergencyContact: '赵女士 13800000006',
    serviceLevel: '常规关注',
    lastStatus: '正常'
  }
];

/**
 * 人员资源数据
 */
const INITIAL_RESOURCES = [
  {
    id: 'P001',
    name: '张网格员',
    role: '网格员',
    skills: ['电话核实', '上门巡访', '工单协调'],
    area: '幸福社区',
    status: '在岗',
    avgResponseMinutes: 25
  },
  {
    id: 'P002',
    name: '李网格员',
    role: '网格员',
    skills: ['电话核实', '上门巡访', '数据录入'],
    area: '幸福社区',
    status: '在岗',
    avgResponseMinutes: 30
  },
  {
    id: 'P003',
    name: '王医生',
    role: '社区医生',
    skills: ['健康评估', '慢病管理', '康复指导'],
    area: '幸福社区卫生站',
    status: '在岗',
    avgResponseMinutes: 40
  },
  {
    id: 'P004',
    name: '刘医生',
    role: '社区医生',
    skills: ['健康评估', '急救处理', '心理健康'],
    area: '幸福社区卫生站',
    status: '在岗',
    avgResponseMinutes: 35
  },
  {
    id: 'P005',
    name: '赵师傅',
    role: '物业/维修人员',
    skills: ['水电维修', '管道疏通', '安全检查'],
    area: '幸福社区物业',
    status: '在岗',
    avgResponseMinutes: 50
  },
  {
    id: 'P006',
    name: '小周',
    role: '志愿者',
    skills: ['代购代办', '陪伴聊天', '就医陪诊'],
    area: '幸福社区',
    status: '在岗',
    avgResponseMinutes: 60
  },
  {
    id: 'P007',
    name: '小陈',
    role: '志愿者',
    skills: ['代购代办', '送餐服务', '科技指导'],
    area: '幸福社区',
    status: '在岗',
    avgResponseMinutes: 45
  }
];

/**
 * 风险识别关键词规则
 */
const RISK_KEYWORDS = {
  high: ['跌倒', '摔倒', '昏迷', '胸闷', '联系不上', '严重', '突发', '报警', '呼吸困难', '流血', '骨折', '意识不清'],
  medium: ['头晕', '不舒服', '两天', '未报平安', '家属反馈', '轻微', '乏力', '心慌', '食欲不振'],
  health: ['头晕', '胸闷', '不舒服', '昏迷', '跌倒', '摔倒', '呼吸困难', '流血', '骨折', '心慌'],
  maintenance: ['漏水', '断电', '门锁', '烟感', '水浸', '电路', '堵塞', '水管', '灯泡'],
  life: ['买药', '代购', '送餐', '陪伴', '打扫', '理发', '买菜', '取快递'],
  companion: ['陪诊', '去医院', '复诊', '挂号', '检查', '门诊']
};

/**
 * 生成全局初始状态
 * @returns {Object} 初始状态对象
 */
function getInitialState() {
  return {
    elders: JSON.parse(JSON.stringify(INITIAL_ELDERS)),
    resources: JSON.parse(JSON.stringify(INITIAL_RESOURCES)),
    careRecords: [],
    workOrders: []
  };
}
