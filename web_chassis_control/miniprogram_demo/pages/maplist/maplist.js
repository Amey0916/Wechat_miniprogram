const app = getApp()

Page({
  data: {
    theme: 'dark', fontSize: 'normal', t: {},
    managing: false, maps: [], editingIdx: -1, editingName: '',
  },

  onLoad() { this._loadMaps() },
  onShow()  { this._refresh(); this._loadMaps() },

  _refresh() {
    const { lang, fontSize } = app.globalData
    this.setData({ theme: app.resolvedTheme(), fontSize, t: app.t(lang) })
  },

  _loadMaps() {
    const saved = wx.getStorageSync('maps') || []
    // 新扫图后弹出编辑
    const newIdx = app.globalData.newMapIdx
    if (newIdx !== undefined && newIdx >= 0) {
      app.globalData.newMapIdx = -1
      this.setData({ maps: saved, editingIdx: newIdx, editingName: saved[newIdx]?.name || '' })
    } else {
      this.setData({ maps: saved })
    }
  },

  _saveMaps() { wx.setStorageSync('maps', this.data.maps) },

  goSettings() {
    app.globalData.prevPage = 'pages/maplist/maplist'
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  toggleManage() { this.setData({ managing: !this.data.managing }) },

  onMapTap(e) {
    if (this.data.managing) return
    const idx = e.currentTarget.dataset.idx
    app.globalData.selectedMap = this.data.maps[idx]
    wx.navigateTo({ url: '/pages/smartctrl/smartctrl' })
  },

  onAddMap() {
    wx.showLoading({ title: '正在启动建图节点…' })
    const socket = wx.connectSocket({ url: app.globalData.serverWsUrl, timeout: 3000 })
    socket.onOpen(() => {
      socket.send({
        data: JSON.stringify({ type: 'cmd', action: 'shell', command: 'source install/setup.bash && ros2 launch yhs_nav2 gmapping.launch.py' }),
        success: () => { socket.close(); wx.hideLoading(); wx.navigateTo({ url: '/pages/scanintro/scanintro' }) },
        fail:    () => { socket.close(); wx.hideLoading(); wx.showToast({ title: '启动失败', icon: 'none' }) }
      })
    })
    socket.onError(() => { wx.hideLoading(); wx.showToast({ title: '连接失败', icon: 'none' }) })
  },

  onDeleteMap(e) {
    const idx = e.currentTarget.dataset.idx
    const maps = [...this.data.maps]
    maps.splice(idx, 1)
    this.setData({ maps })
    this._saveMaps()
  },

  onEditName(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ editingIdx: idx, editingName: this.data.maps[idx].name })
  },

  onNameInput(e) { this.setData({ editingName: e.detail.value }) },

  onNameConfirm() {
    const { editingIdx, editingName, maps } = this.data
    if (editingIdx < 0) return
    const updated = [...maps]
    updated[editingIdx].name = editingName || updated[editingIdx].name
    this.setData({ maps: updated, editingIdx: -1, editingName: '' })
    this._saveMaps()
  },

  onNameCancel() { this.setData({ editingIdx: -1, editingName: '' }) }
})
