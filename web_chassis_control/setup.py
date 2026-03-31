from setuptools import find_packages, setup

package_name = 'web_chassis_control'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name + '/launch', [
            'launch/web_chassis_control.launch.py',
            'launch/websocket_only.launch.py',
        ]),
        ('share/' + package_name + '/miniprogram_demo', [
            'miniprogram_demo/app.js',
            'miniprogram_demo/app.json',
            'miniprogram_demo/app.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/home', [
            'miniprogram_demo/pages/home/home.js',
            'miniprogram_demo/pages/home/home.json',
            'miniprogram_demo/pages/home/home.wxml',
            'miniprogram_demo/pages/home/home.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/settings', [
            'miniprogram_demo/pages/settings/settings.js',
            'miniprogram_demo/pages/settings/settings.json',
            'miniprogram_demo/pages/settings/settings.wxml',
            'miniprogram_demo/pages/settings/settings.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/maplist', [
            'miniprogram_demo/pages/maplist/maplist.js',
            'miniprogram_demo/pages/maplist/maplist.json',
            'miniprogram_demo/pages/maplist/maplist.wxml',
            'miniprogram_demo/pages/maplist/maplist.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/scanintro', [
            'miniprogram_demo/pages/scanintro/scanintro.js',
            'miniprogram_demo/pages/scanintro/scanintro.json',
            'miniprogram_demo/pages/scanintro/scanintro.wxml',
            'miniprogram_demo/pages/scanintro/scanintro.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/scanning', [
            'miniprogram_demo/pages/scanning/scanning.js',
            'miniprogram_demo/pages/scanning/scanning.json',
            'miniprogram_demo/pages/scanning/scanning.wxml',
            'miniprogram_demo/pages/scanning/scanning.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/smartctrl', [
            'miniprogram_demo/pages/smartctrl/smartctrl.js',
            'miniprogram_demo/pages/smartctrl/smartctrl.json',
            'miniprogram_demo/pages/smartctrl/smartctrl.wxml',
            'miniprogram_demo/pages/smartctrl/smartctrl.wxss',
        ]),
        ('share/' + package_name + '/miniprogram_demo/pages/chassis', [
            'miniprogram_demo/pages/chassis/chassis.js',
            'miniprogram_demo/pages/chassis/chassis.json',
            'miniprogram_demo/pages/chassis/chassis.wxml',
            'miniprogram_demo/pages/chassis/chassis.wxss',
        ]),
    ],
    install_requires=['setuptools', 'websockets>=10.0'],
    zip_safe=True,
    maintainer='xwqf',
    maintainer_email='zhengxg178@163.com',
    description='Bridge WeChat mini program WebSocket control to ROS2 chassis control topics.',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'web_control_bridge = web_chassis_control.web_control_bridge:main',
        ],
    },
)
