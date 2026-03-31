#!/usr/bin/python3
"""
websocket_only.launch.py

只启动 web_chassis_control WebSocket 桥接节点。
建议配置为开机自启，这样小程序随时可以连接并通过 WebSocket 发送指令控制工控机。

开机自启配置示例（systemd）：
    sudo nano /etc/systemd/system/ros2_websocket.service
    [Unit]
    Description=ROS2 WebSocket Bridge
    After=network.target
    [Service]
    User=<your_user>
    ExecStart=/bin/bash -c 'source /opt/ros/humble/setup.bash && source ~/ros2_ws/install/setup.bash && ros2 launch web_chassis_control websocket_only.launch.py'
    Restart=always
    [Install]
    WantedBy=multi-user.target
    sudo systemctl enable ros2_websocket.service
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, LogInfo
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    host         = LaunchConfiguration('host')
    port         = LaunchConfiguration('port')
    chassis_type = LaunchConfiguration('chassis_type')

    return LaunchDescription([
        DeclareLaunchArgument('host',         default_value='0.0.0.0',  description='WebSocket bind address'),
        DeclareLaunchArgument('port',         default_value='8899',     description='WebSocket port'),
        DeclareLaunchArgument('chassis_type', default_value='FW',       description='Chassis type: DGT/FW/FR/MK'),
        LogInfo(msg='[websocket_only] Starting web_chassis_control WebSocket bridge...'),
        Node(
            package='web_chassis_control',
            executable='web_control_bridge',
            name='web_chassis_control_node',
            output='screen',
            parameters=[{
                'host':         host,
                'port':         port,
                'chassis_type': chassis_type,
            }],
        ),
    ])
