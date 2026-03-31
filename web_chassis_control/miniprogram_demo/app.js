const legacyHttpUrl = wx.getStorageSync('serverBaseUrl')

// ── 多语言文本字典 ────────────────────────────────────────────────────────────
const I18N = {
  'zh-cn': {
    // 通用
    settings: '设置', back: '返回',
    // 主界面
    home_sub: 'SMART MOBILE',
    home_title1: '智慧移动', home_title2: '垃圾桶',
    home_tagline: '清洁 · 智能 · 未来',
    home_hint: '请确保机器人已上电并连接至同一网络',
    home_launch: '开启智慧生活', home_launching: '正在启动…', home_launched: '已启动',
    // 设置
    set_theme: '显示色调', set_dark: '黑暗', set_light: '明亮', set_auto: '自动',
    set_lang: '语言 / Language',
    set_font: '字体大小', set_normal: '正常', set_large: '特大',
    // 地图
    map_title: '选择地图', map_manage: '管理', map_done: '完成',
    map_add: '增加新地图', map_edit_title: '编辑地图名称',
    map_edit_placeholder: '请输入地图名称',
    map_cancel: '取消', map_confirm: '确认',
    // 扫图说明
    intro_title: '扫图说明', intro_banner: '开始建图前请仔细阅读',
    intro_warn: '扫图期间请保持 ROS2 节点运行，不要关闭后台服务。',
    intro_start: '开始扫图',
    intro_steps: [
      '将机器人放置在合适的起始位置，确保周围环境开阔，避免遮挡激光雷达视野。',
      '点击"开始扫图"后系统将自动记录当前位置为坐标原点（基站），请勿在此前移动机器人。',
      '使用底盘控制缓慢推动机器人在需要建图的区域内行驶，速度建议不超过 0.3 m/s，确保地图完整。',
      '扫图完成后，务必先将机器人驾驶回起始位置（基站），再点击"保存地图"，否则导航原点将偏移。',
    ],
    // 扫图
    scan_title: '扫图', scan_rviz_hint: 'RViz2 画面将显示于此',
    scan_go_home: '返回\n基站', scan_save: '保存\n地图',
    scan_unlock: '🔓 已解锁', scan_locked: '🔒 点击解锁',
    scan_chassis: '🎮 底盘控制', scan_back: '返回上一界面',
    scan_modal_title: '保存地图',
    scan_modal_warn: '请务必确认小车已返回基站',
    scan_modal_hint: '保存后将返回地图选择界面，您可以为地图命名。',
    scan_modal_back: '返回', scan_modal_confirm: '确认保存',
    // 智慧控制
    smart_title: '智慧控制',
    smart_nav_name: '自主导航', smart_nav_desc_on: '导航运行中，点击关闭', smart_nav_desc_off: '启动导航节点与 RViz2',
    smart_follow_on: '关闭功能', smart_follow_off: '开启功能',
    smart_follow_desc_on: '功能运行中，点击关闭', smart_follow_desc_off: '启动自定义功能节点',
    smart_chassis: '底盘控制', smart_chassis_desc: '手动遥控底盘运动',
    smart_estop_on: '底盘已解锁', smart_estop_off: '急停 / 锁定',
    smart_estop_desc_on: '点击重新锁定底盘', smart_estop_desc_off: '点击解锁底盘运动',
    smart_nav_hint: '导航画面将显示于此',
    // 底盘控制
    chassis_title: '底盘控制',
    chassis_unlocked: '底盘已解锁', chassis_locked: '底盘已锁定',
    chassis_unlock_hint_on: '点击锁定底盘', chassis_unlock_hint_off: '点击解锁底盘',
    chassis_speed_label: '前进 / 后退速度',
    chassis_horn: '鸣笛', chassis_lamp_on: '灯光开', chassis_lamp_off: '灯光关',
    chassis_back: '返回上一界面',
  },
  'zh-tw': {
    settings: '設定', back: '返回',
    home_sub: 'SMART MOBILE',
    home_title1: '智慧移動', home_title2: '垃圾桶',
    home_tagline: '清潔 · 智能 · 未來',
    home_hint: '請確保機器人已上電並連接至同一網路',
    home_launch: '開啟智慧生活', home_launching: '正在啟動…', home_launched: '已啟動',
    set_theme: '顯示色調', set_dark: '黑暗', set_light: '明亮', set_auto: '自動',
    set_lang: '語言 / Language',
    set_font: '字體大小', set_normal: '正常', set_large: '特大',
    map_title: '選擇地圖', map_manage: '管理', map_done: '完成',
    map_add: '增加新地圖', map_edit_title: '編輯地圖名稱',
    map_edit_placeholder: '請輸入地圖名稱',
    map_cancel: '取消', map_confirm: '確認',
    intro_title: '建圖說明', intro_banner: '開始建圖前請仔細閱讀',
    intro_warn: '建圖期間請保持 ROS2 節點運行，不要關閉後台服務。',
    intro_start: '開始建圖',
    intro_steps: [
      '將機器人放置在合適的起始位置，確保周圍環境開闊，避免遮擋雷射雷達視野。',
      '點擊「開始建圖」後系統將自動記錄當前位置為座標原點（基站），請勿在此前移動機器人。',
      '使用底盤控制緩慢推動機器人在需要建圖的區域內行駛，速度建議不超過 0.3 m/s。',
      '建圖完成後，務必先將機器人駕駛回起始位置（基站），再點擊「儲存地圖」。',
    ],
    scan_title: '建圖', scan_rviz_hint: 'RViz2 畫面將顯示於此',
    scan_go_home: '返回\n基站', scan_save: '儲存\n地圖',
    scan_unlock: '🔓 已解鎖', scan_locked: '🔒 點擊解鎖',
    scan_chassis: '🎮 底盤控制', scan_back: '返回上一介面',
    scan_modal_title: '儲存地圖',
    scan_modal_warn: '請務必確認小車已返回基站',
    scan_modal_hint: '儲存後將返回地圖選擇介面，您可以為地圖命名。',
    scan_modal_back: '返回', scan_modal_confirm: '確認儲存',
    smart_title: '智慧控制',
    smart_nav_name: '自主導航', smart_nav_desc_on: '導航運行中，點擊關閉', smart_nav_desc_off: '啟動導航節點與 RViz2',
    smart_follow_on: '關閉功能', smart_follow_off: '開啟功能',
    smart_follow_desc_on: '功能運行中，點擊關閉', smart_follow_desc_off: '啟動自訂功能節點',
    smart_chassis: '底盤控制', smart_chassis_desc: '手動遙控底盤運動',
    smart_estop_on: '底盤已解鎖', smart_estop_off: '急停 / 鎖定',
    smart_estop_desc_on: '點擊重新鎖定底盤', smart_estop_desc_off: '點擊解鎖底盤運動',
    smart_nav_hint: '導航畫面將顯示於此',
    chassis_title: '底盤控制',
    chassis_unlocked: '底盤已解鎖', chassis_locked: '底盤已鎖定',
    chassis_unlock_hint_on: '點擊鎖定底盤', chassis_unlock_hint_off: '點擊解鎖底盤',
    chassis_speed_label: '前進 / 後退速度',
    chassis_horn: '鳴笛', chassis_lamp_on: '燈光開', chassis_lamp_off: '燈光關',
    chassis_back: '返回上一介面',
  },
  'en': {
    settings: 'Settings', back: 'Back',
    home_sub: 'SMART MOBILE',
    home_title1: 'Smart', home_title2: 'Trash Bot',
    home_tagline: 'Clean · Smart · Future',
    home_hint: 'Ensure the robot is powered on and on the same network.',
    home_launch: 'Start Smart Life', home_launching: 'Starting…', home_launched: 'Started',
    set_theme: 'Theme', set_dark: 'Dark', set_light: 'Light', set_auto: 'Auto',
    set_lang: 'Language',
    set_font: 'Font Size', set_normal: 'Normal', set_large: 'Large',
    map_title: 'Select Map', map_manage: 'Manage', map_done: 'Done',
    map_add: 'Add New Map', map_edit_title: 'Edit Map Name',
    map_edit_placeholder: 'Enter map name',
    map_cancel: 'Cancel', map_confirm: 'Confirm',
    intro_title: 'Mapping Guide', intro_banner: 'Read before you start',
    intro_warn: 'Keep ROS2 nodes running during mapping. Do not close the backend.',
    intro_start: 'Start Mapping',
    intro_steps: [
      'Place the robot at a suitable starting position with a clear line of sight for the LiDAR.',
      'After tapping "Start Mapping", the system records the current position as the origin. Do not move the robot beforehand.',
      'Drive the robot slowly (≤ 0.3 m/s) through the area you want to map.',
      'When done, drive the robot back to the origin before tapping "Save Map" to avoid navigation offset.',
    ],
    scan_title: 'Mapping', scan_rviz_hint: 'RViz2 view will appear here',
    scan_go_home: 'Go\nHome', scan_save: 'Save\nMap',
    scan_unlock: '🔓 Unlocked', scan_locked: '🔒 Tap to Unlock',
    scan_chassis: '🎮 Chassis', scan_back: 'Back',
    scan_modal_title: 'Save Map',
    scan_modal_warn: 'Make sure the robot has returned to base!',
    scan_modal_hint: 'You will be redirected to the map list to name this map.',
    scan_modal_back: 'Back', scan_modal_confirm: 'Confirm Save',
    smart_title: 'Smart Control',
    smart_nav_name: 'Auto Navigate', smart_nav_desc_on: 'Navigation running. Tap to stop.', smart_nav_desc_off: 'Launch nav node & RViz2',
    smart_follow_on: 'Stop Function', smart_follow_off: 'Start Function',
    smart_follow_desc_on: 'Function running. Tap to stop.', smart_follow_desc_off: 'Launch custom function node',
    smart_chassis: 'Chassis Control', smart_chassis_desc: 'Manual chassis driving',
    smart_estop_on: 'Chassis Unlocked', smart_estop_off: 'E-Stop / Lock',
    smart_estop_desc_on: 'Tap to lock chassis', smart_estop_desc_off: 'Tap to unlock chassis',
    smart_nav_hint: 'Navigation view will appear here',
    chassis_title: 'Chassis Control',
    chassis_unlocked: 'Chassis Unlocked', chassis_locked: 'Chassis Locked',
    chassis_unlock_hint_on: 'Tap to lock', chassis_unlock_hint_off: 'Tap to unlock',
    chassis_speed_label: 'Forward / Backward Speed',
    chassis_horn: 'Horn', chassis_lamp_on: 'Light ON', chassis_lamp_off: 'Light OFF',
    chassis_back: 'Back',
  }
}

App({
  globalData: {
    serverWsUrl: wx.getStorageSync('serverWsUrl') || (legacyHttpUrl ? legacyHttpUrl.replace(/^http/, 'ws') : 'ws://192.168.1.102:8899'),
    theme:    wx.getStorageSync('theme')    || 'dark',
    lang:     wx.getStorageSync('lang')     || 'zh-cn',
    fontSize: wx.getStorageSync('fontSize') || 'normal',
    prevPage: '',
    chassisLaunched: false,
    navLaunched:     false,
    followLaunched:  false,
    // 底盘解锁状态：scanning 和 chassis 两个页面共享此状态，实现"双开关联动"
    chassisUnlocked: false,
    chassisLampOn:   false,
  },

  onLaunch() {
    // 自动主题：根据当前小时判断
    if (this.globalData.theme === 'auto') {
      this.globalData.theme = this._autoTheme()
    }
  },

  // 获取当前语言的文本字典
  t(lang) {
    return I18N[lang] || I18N['zh-cn']
  },

  // 自动主题：6:00-18:00 明亮，其余黑暗
  _autoTheme() {
    const h = new Date().getHours()
    return (h >= 6 && h < 18) ? 'light' : 'dark'
  },

  // 计算实际应用的主题（auto 时实时判断）
  resolvedTheme() {
    const t = this.globalData.theme
    return t === 'auto' ? this._autoTheme() : t
  },

  setTheme(theme) {
    this.globalData.theme = theme
    wx.setStorageSync('theme', theme)
  },

  setLang(lang) {
    this.globalData.lang = lang
    wx.setStorageSync('lang', lang)
  },

  setFontSize(fontSize) {
    this.globalData.fontSize = fontSize
    wx.setStorageSync('fontSize', fontSize)
  },
}) 