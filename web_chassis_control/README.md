# web_chassis_control

## 工控机依赖安装（必需）

请先确认工控机已经安装并可执行以下组件：

1. ROS2 运行环境（与你项目一致的发行版）
2. `web_chassis_control` 本包依赖：
   - `python3-websockets`
   - `yhs_can_interfaces`
3. 底盘与导航相关包：
   - `yhs_can_control`
   - `yhs_nav2`
4. RViz2：
   - 命令 `rviz2` 可直接启动
5. 建议安装终端工具（用于 `shell_new_term`）：
   - `tmux`（推荐，服务器/无桌面环境也可用）
   - 或任一图形终端：`gnome-terminal` / `xterm` / `konsole` / `xfce4-terminal`
6. 如需“智慧控制->开启功能”：
   - `yhs_nav2` 中应存在可用的 `follow.launch.py`（当前小程序已对齐为 `start_follow`）

可快速检查：

```bash
which rviz2
which tmux
ros2 pkg list | grep -E 'yhs_can_control|yhs_nav2|web_chassis_control'
```

## 启动方式

1. 先启动底盘 CAN 节点（保持原有遥控器逻辑不变）：

```bash
ros2 launch yhs_can_control yhs_can_control.launch.py
```

2. 启动微信小程序 WebSocket 桥接节点：

```bash
ros2 launch web_chassis_control web_chassis_control.launch.py chassis_type:=FW host:=0.0.0.0 port:=8899
```

## WebSocket 接口

- `ws://<host>:<port>`：接收 JSON 文本消息并发布 ROS2 话题
- `type=control`：发布 `web_ctrl_cmd`
- `type=io`：发布 `web_io_cmd`
- `type=ping`：心跳（不发布）

消息格式：

```json
{"type":"control","payload":{"velocity":0.4,"steering":0.0,"gear":4,"linear_x":0.4}}
```

`payload` 字段内的字段名与 `WebCtrlCmd.msg`、`WebIoCmd.msg` 对齐。

说明：
- `type=launch` 建议使用 `payload.action` 传递动作，例如：
  - `start_chassis` / `stop_chassis`
  - `start_nav` / `stop_nav`
  - `start_follow` / `stop_follow`
- 若 action 不存在，后端会返回 `{ok:false,error:"unknown launch action: ..."}`，便于前端直接提示错误。
- `type=cmd` 若命令为空，后端会返回 `{ok:false,error:"empty command for action: ..."}`。

## 微信小程序示例

示例工程在：

`src/web_chassis_control/miniprogram_demo`

将 `app.js` 中的 `serverWsUrl` 修改为底盘主机 IP 后，用微信开发者工具打开该目录即可运行。

## 常见问题排障

### 1) “开启功能”点击后没反应

已修复为：小程序发送 `type=launch, payload.action=start_follow`，并等待后端回执。

若失败会直接弹出错误文案，请重点检查：
- 工控机是否已启动 `web_chassis_control` WebSocket 桥接
- `yhs_nav2/follow.launch.py` 是否存在并可运行
- 小程序 `serverWsUrl` 是否指向正确工控机 IP:8899
- 手机与工控机是否同网段、端口 8899 是否放通

### 2) RViz2 画面没有图像

当前小程序页面是“占位视图”（提示文本），并非视频流渲染页面。
即使工控机 `rviz2` 启动成功，也不会自动把桌面画面传到小程序里。
如需真实画面，需要额外接入流媒体方案（如 WebRTC/MJPEG）并在小程序端显示。

## 可复现联调步骤（建议按顺序）

1. 工控机终端 A 启动底盘：

```bash
ros2 launch yhs_can_control yhs_can_control.launch.py
```

2. 工控机终端 B 启动桥接：

```bash
ros2 launch web_chassis_control web_chassis_control.launch.py chassis_type:=FW host:=0.0.0.0 port:=8899
```

3. 小程序 `app.js` 设置 `serverWsUrl` 为 `ws://<工控机IP>:8899`。
   - 可选：设置本地存储 `rvizWebUrl`（默认自动推导为 `http://<工控机IP>:8080/`），用于“扫图/智慧控制”页面内嵌 RViz Web 页面。

4. 手机与工控机连同一网络，打开小程序：
    - 进入“智慧控制”点击“开启功能”
   - 期望结果：出现“正在启动功能…”；若 `follow.launch.py` 不存在或启动后立即退出，会直接返回错误 toast

5. 在工控机观察桥接日志：
   - 应看到 launch 动作 `start_follow` 被接收
   - 若失败，日志含具体错误（包不存在/launch 文件不存在等）

6. 进入“底盘控制”：
   - 确认小字号文本（如“行进速度/0.1/m/s/点击解锁底盘”）已整体增大 4rpx
