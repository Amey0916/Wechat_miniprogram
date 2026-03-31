import asyncio
import json
import subprocess
import threading
from typing import Any, Dict, Optional

import rclpy
from rclpy.node import Node
import websockets
from websockets.exceptions import ConnectionClosed
from yhs_can_interfaces.msg import WebCtrlCmd, WebIoCmd


CHASSIS_TYPE_MAP = {
    'DGT': WebCtrlCmd.CHASSIS_DGT,
    'FW': WebCtrlCmd.CHASSIS_FW,
    'FR': WebCtrlCmd.CHASSIS_FR,
    'MK': WebCtrlCmd.CHASSIS_MK,
}

MAX_REQUEST_SIZE = 4096
MAX_BRAKE_PERCENTAGE = 100.0
MAX_TURN_LAMP = 2


def _bool_value(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.lower() in ('1', 'true', 'yes', 'on')
    return default


def _float_value(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _int_value(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class WebControlBridgeNode(Node):
    def __init__(self) -> None:
        super().__init__('web_chassis_control_node')

        self.declare_parameter('host', '0.0.0.0')
        self.declare_parameter('port', 8899)
        self.declare_parameter('chassis_type', 'FW')

        self._host = self.get_parameter('host').get_parameter_value().string_value
        self._port = self.get_parameter('port').get_parameter_value().integer_value
        chassis_type = self.get_parameter('chassis_type').get_parameter_value().string_value.upper()
        self._chassis_type = CHASSIS_TYPE_MAP.get(chassis_type, WebCtrlCmd.CHASSIS_FW)

        self._ctrl_pub = self.create_publisher(WebCtrlCmd, 'web_ctrl_cmd', 10)
        self._io_pub = self.create_publisher(WebIoCmd, 'web_io_cmd', 10)
        self._lock = threading.Lock()
        # 子进程管理：key=action名称, value=Popen对象
        self._procs: Dict[str, Optional[subprocess.Popen]] = {}
        # ROS2 各 launch 动作映射表
        self._launch_map = {
            'start_chassis':      ['ros2', 'launch', 'yhs_can_control', 'yhs_can_control.launch.py'],
            'stop_chassis':       None,   # 停止对应 start_chassis 的进程
            'start_cartographer': ['ros2', 'launch', 'yhs_nav2', 'cartographer.launch.py'],
            'stop_cartographer':  None,
            'start_nav':          ['ros2', 'launch', 'yhs_nav2', 'navigation.launch.py'],
            'stop_nav':           None,
            'start_follow':       ['ros2', 'launch', 'yhs_nav2', 'follow.launch.py'],
            'stop_follow':        None,
        }
        self._loop = asyncio.new_event_loop()
        self._server = None

        self._server_thread = threading.Thread(target=self._run_websocket_server, daemon=True)
        self._server_thread.start()
        self.get_logger().info(f'web_chassis_control WebSocket server starting at ws://{self._host}:{self._port}')

    def _run_websocket_server(self) -> None:
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._start_server())
        self._loop.run_forever()

    async def _start_server(self) -> None:
        self._server = await websockets.serve(
            self._handle_websocket,
            self._host,
            int(self._port),
            max_size=MAX_REQUEST_SIZE,
        )
        self.get_logger().info(f'web_chassis_control WebSocket server started at ws://{self._host}:{self._port}')

    async def _shutdown_server(self) -> None:
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

    def _decode_message(self, raw: Any) -> Dict[str, Any]:
        if isinstance(raw, bytes):
            raw = raw.decode('utf-8')
        if not isinstance(raw, str):
            raise ValueError('message must be text JSON')
        if len(raw.encode('utf-8')) > MAX_REQUEST_SIZE:
            raise ValueError('message too large')
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            raise ValueError('JSON payload must be an object')
        return payload

    def _dispatch_message(self, payload: Dict[str, Any]) -> None:
        message_type = str(payload.get('type', 'control')).lower()
        data = payload.get('payload', payload)
        if not isinstance(data, dict):
            raise ValueError('payload must be an object')

        if message_type in ('control', 'ctrl'):
            self.publish_ctrl(data)
            return

        if message_type == 'io':
            self.publish_io(data)
            return

        if message_type == 'ping':
            return

        if message_type == 'launch':
            action = str(data.get('action', '')).lower()
            self._handle_launch_action(action)
            return

        if message_type == 'cmd':
            action = str(payload.get('action', '')).lower()
            command = str(payload.get('command', '')).strip()
            self._handle_cmd_action(action, command)
            return

        raise ValueError(f'unsupported message type: {message_type}')

    async def _handle_websocket(self, websocket: Any, _path: str = '') -> None:
        client = getattr(websocket, 'remote_address', None)
        self.get_logger().info(f'websocket connected: {client}')
        try:
            async for raw_message in websocket:
                try:
                    payload = self._decode_message(raw_message)
                    self._dispatch_message(payload)
                    await websocket.send(json.dumps({'ok': True}))
                except Exception as exc:
                    await websocket.send(json.dumps({'ok': False, 'error': str(exc)}))
        except ConnectionClosed:
            pass
        finally:
            self.get_logger().info(f'websocket disconnected: {client}')

    def _handle_cmd_action(self, action: str, command: str) -> None:
        """处理 type='cmd' 的 shell 指令：
        - action='shell'：在后台 bash 中执行命令（支持 source、&&、cd 等 shell 语法）
        - action='shell_new_term'：在独立图形终端窗口中执行命令（尝试 gnome-terminal / xterm）
        - action='save_map' / 'go_home'：内置快捷指令（可扩展）
        """
        if not command and action in ('save_map',):
            # 内置快捷指令映射
            builtin = {
                'save_map': 'source install/setup.bash && cd ~/ros2_ws/src/yhs_nav2/map && ros2 run nav2_map_server map_server_cli -free 0.15 -occ 0.65 -f g1',
            }
            command = builtin.get(action, '')

        if not command:
            self.get_logger().warning(f'[cmd] empty command for action: {action}')
            return

        if action == 'shell_new_term':
            def _run_new_term():
                import os
                import shutil
                # 工作目录：优先 ~/ros2_ws，否则 home 目录
                home = os.path.expanduser('~')
                cwd = os.path.join(home, 'ros2_ws') if os.path.isdir(os.path.join(home, 'ros2_ws')) else home
                # 继承当前环境并补充 HOME
                env = os.environ.copy()
                env.setdefault('HOME', home)

                # 1. 优先用 tmux（服务器/无头环境通用）
                if shutil.which('tmux'):
                    try:
                        # 在 tmux 新窗口里执行命令，窗口结束后保留以便查看输出
                        subprocess.Popen(
                            ['tmux', 'new-window', '-n', 'ros_func',
                             f'bash -c "{command}; echo --- DONE exit=$? ---; read"'],
                            cwd=cwd, env=env
                        )
                        self.get_logger().info('[cmd] shell_new_term: launched via tmux new-window')
                        return
                    except Exception as e:
                        self.get_logger().warning(f'[cmd] tmux failed: {e}')

                # 2. 图形终端（有桌面环境时）
                display = env.get('DISPLAY', '')
                if display:
                    for term_cmd in (
                        ['gnome-terminal', '--working-directory', cwd, '--', 'bash', '-c', command],
                        ['xterm', '-e', f'bash -c "{command}; read"'],
                        ['konsole', '--workdir', cwd, '-e', 'bash', '-c', command],
                        ['xfce4-terminal', '--working-directory', cwd, '-e', f'bash -c "{command}; read"'],
                    ):
                        if shutil.which(term_cmd[0]):
                            try:
                                subprocess.Popen(term_cmd, cwd=cwd, env=env)
                                self.get_logger().info(f'[cmd] shell_new_term: launched via {term_cmd[0]}')
                                return
                            except Exception as e:
                                self.get_logger().warning(f'[cmd] {term_cmd[0]} failed: {e}')
                                continue

                # 3. 最终回退：直接后台 bash 执行（不开新终端窗口）
                self.get_logger().warning('[cmd] shell_new_term: no tmux/terminal found, falling back to background bash')
                try:
                    subprocess.Popen(['bash', '-c', command], cwd=cwd, env=env,
                                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                except Exception as exc:
                    self.get_logger().error(f'[cmd] shell_new_term fallback error: {exc}')

            threading.Thread(target=_run_new_term, daemon=True).start()
        else:
            # action='shell' 或其他：用 bash -c 执行，支持 source / && / cd 等 shell 语法
            def _run_shell():
                import os
                home = os.path.expanduser('~')
                cwd = os.path.join(home, 'ros2_ws') if os.path.isdir(os.path.join(home, 'ros2_ws')) else home
                env = os.environ.copy()
                env.setdefault('HOME', home)
                try:
                    self.get_logger().info(f'[cmd] shell (cwd={cwd}): {command}')
                    proc = subprocess.Popen(
                        ['bash', '-c', command],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        cwd=cwd,
                        env=env,
                    )
                    out, _ = proc.communicate()
                    self.get_logger().info(f'[cmd] shell exited ({proc.returncode}): {out[-500:] if out else ""}')
                except Exception as exc:
                    self.get_logger().error(f'[cmd] shell error: {exc}')
            threading.Thread(target=_run_shell, daemon=True).start()

    def _handle_launch_action(self, action: str) -> None:
        """在后台线程中启动或停止对应的 ROS2 launch 进程。"""
        # stop_xxx：终止对应的 start_xxx 进程
        if action.startswith('stop_'):
            start_key = 'start_' + action[5:]
            proc = self._procs.get(start_key)
            if proc and proc.poll() is None:
                proc.terminate()
                self.get_logger().info(f'[launch] terminated process for {start_key}')
                self._procs[start_key] = None
            else:
                self.get_logger().info(f'[launch] no running process for {start_key}')
            return

        cmd = self._launch_map.get(action)
        if cmd is None:
            self.get_logger().warning(f'[launch] unknown action: {action}')
            return

        # 如果已经在运行，不重复启动
        existing = self._procs.get(action)
        if existing and existing.poll() is None:
            self.get_logger().info(f'[launch] {action} already running (pid={existing.pid})')
            return

        def _run():
            try:
                self.get_logger().info(f'[launch] starting: {" ".join(cmd)}')
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True
                )
                self._procs[action] = proc
                self.get_logger().info(f'[launch] {action} started (pid={proc.pid})')
                # 等待进程结束，记录退出码
                rc = proc.wait()
                self.get_logger().info(f'[launch] {action} exited with code {rc}')
            except Exception as exc:
                self.get_logger().error(f'[launch] failed to start {action}: {exc}')

        threading.Thread(target=_run, daemon=True).start()

    def publish_ctrl(self, payload: Dict[str, Any]) -> None:
        msg = WebCtrlCmd()
        msg.chassis_type = self._chassis_type
        msg.linear_x = _float_value(payload.get('linear_x'))
        msg.linear_y = _float_value(payload.get('linear_y'))
        msg.angular_z = _float_value(payload.get('angular_z'))
        msg.velocity = _float_value(payload.get('velocity'))
        msg.steering = _float_value(payload.get('steering'))
        msg.brake = max(0.0, min(_float_value(payload.get('brake')), MAX_BRAKE_PERCENTAGE))
        msg.gear = max(0, min(_int_value(payload.get('gear')), 255))
        with self._lock:
            self._ctrl_pub.publish(msg)

    def publish_io(self, payload: Dict[str, Any]) -> None:
        msg = WebIoCmd()
        msg.chassis_type = self._chassis_type
        msg.io_cmd_enable = _bool_value(payload.get('io_cmd_enable'))
        msg.io_cmd_lamp_ctrl = _bool_value(payload.get('io_cmd_lamp_ctrl'))
        msg.io_cmd_unlock = _bool_value(payload.get('io_cmd_unlock'))
        msg.io_cmd_lower_beam_headlamp = _bool_value(payload.get('io_cmd_lower_beam_headlamp'))
        msg.io_cmd_upper_beam_headlamp = _bool_value(payload.get('io_cmd_upper_beam_headlamp'))
        msg.io_cmd_turn_lamp = max(0, min(_int_value(payload.get('io_cmd_turn_lamp')), MAX_TURN_LAMP))
        msg.io_cmd_braking_lamp = _bool_value(payload.get('io_cmd_braking_lamp'))
        msg.io_cmd_clearance_lamp = _bool_value(payload.get('io_cmd_clearance_lamp'))
        msg.io_cmd_fog_lamp = _bool_value(payload.get('io_cmd_fog_lamp'))
        msg.io_cmd_speaker = max(0, min(_int_value(payload.get('io_cmd_speaker')), 255))
        msg.io_cmd_wireless_charge = max(0, min(_int_value(payload.get('io_cmd_wireless_charge')), 255))
        msg.io_cmd_dis_charge = _bool_value(payload.get('io_cmd_dis_charge'))
        with self._lock:
            self._io_pub.publish(msg)

    def destroy_node(self) -> bool:
        try:
            shutdown_future = asyncio.run_coroutine_threadsafe(self._shutdown_server(), self._loop)
            shutdown_future.result(timeout=2.0)
            self._loop.call_soon_threadsafe(self._loop.stop)
            self._server_thread.join(timeout=2.0)
        except Exception as exc:
            self.get_logger().warning(f'web server shutdown error: {exc}')
        return super().destroy_node()


def main(args=None) -> None:
    rclpy.init(args=args)
    node = WebControlBridgeNode()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()
