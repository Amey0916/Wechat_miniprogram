# web_chassis_control

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

## 微信小程序示例

示例工程在：

`src/web_chassis_control/miniprogram_demo`

将 `app.js` 中的 `serverWsUrl` 修改为底盘主机 IP 后，用微信开发者工具打开该目录即可运行。
