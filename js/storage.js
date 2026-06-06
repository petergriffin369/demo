/**
 * storage.js - localStorage 读写模块
 * 所有持久化数据使用键名 eldercare_ai_demo_state
 */

const STORAGE_KEY = 'eldercare_ai_demo_state';

/**
 * 从 localStorage 读取全局状态
 * @returns {Object} 全局状态对象
 */
function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('读取 localStorage 失败:', e);
  }
  return null;
}

/**
 * 将全局状态保存到 localStorage
 * @param {Object} state 全局状态对象
 */
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存 localStorage 失败:', e);
  }
}

/**
 * 重置全局状态（删除 localStorage 数据）
 */
function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('重置 localStorage 失败:', e);
  }
}

/**
 * 导出当前数据为 JSON 字符串
 * @param {Object} state 全局状态对象
 * @returns {string} JSON 字符串
 */
function exportData(state) {
  return JSON.stringify(state, null, 2);
}

/**
 * 从 JSON 字符串导入数据
 * @param {string} json JSON 字符串
 * @returns {Object|null} 解析后的状态对象，失败返回 null
 */
function importData(json) {
  try {
    const data = JSON.parse(json);
    if (data && typeof data === 'object') {
      // 基本结构校验：确认包含四个数组字段
      var hasElders = Array.isArray(data.elders);
      var hasResources = Array.isArray(data.resources);
      var hasCareRecords = Array.isArray(data.careRecords);
      var hasWorkOrders = Array.isArray(data.workOrders);
      if (!hasElders || !hasResources || !hasCareRecords || !hasWorkOrders) {
        console.error('导入数据失败：JSON 结构不符合系统数据格式');
        return null;
      }
      saveState(data);
      return data;
    }
  } catch (e) {
    console.error('导入数据失败:', e);
  }
  return null;
}
