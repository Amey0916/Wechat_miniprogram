#!/usr/bin/python3

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    host = LaunchConfiguration('host')
    port = LaunchConfiguration('port')
    chassis_type = LaunchConfiguration('chassis_type')

    return LaunchDescription([
        DeclareLaunchArgument('host', default_value='0.0.0.0'),
        DeclareLaunchArgument('port', default_value='8899'),
        DeclareLaunchArgument('chassis_type', default_value='FW'),
        Node(
            package='web_chassis_control',
            executable='web_control_bridge',
            name='web_chassis_control_node',
            output='screen',
            parameters=[{
                'host': host,
                'port': port,
                'chassis_type': chassis_type,
            }],
        )
    ])
