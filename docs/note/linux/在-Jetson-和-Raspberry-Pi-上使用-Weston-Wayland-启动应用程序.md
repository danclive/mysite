# 在 Jetson 和 Raspberry Pi 上使用 Weston/Wayland 启动应用程序

"Weston [^1] [^2] 是 Wayland 合成器的参考实现，本身也是一个有用的环境。

开箱即用的 Weston 提供了一个非常基本的桌面，或一个全功能的非桌面环境，如汽车、嵌入式、飞行、工业、信息亭、机顶盒和电视。它还提供了一个库，允许其他项目在 Weston 核心基础上构建自己的全功能环境。"

## Jetson

要求 Jetson 的系统版本为 22.04 或以上，也就是 JetPack 6.0 或以上。

### 安装

Jetson 上默认已经安装了 Weston，并提供了 `nvstart-weston.sh` 脚本，可以方便的启动 weston, 可参考 [^3] 。

### 配置

修改 `/etc/xdg/weston/weston.ini` 文件，添加一下内容：

```ini
[shell]
# 桌面背景
background-image=/usr/local/share/boot.png
background-type=scale

# 设置用于打开新窗口的效果
animation=fade

# 设置面板的位置
panel-position=none

[output]
# 输出端口
name=DP-1
#mode=3840x2160
#mode=1920x1080
#transform=flipped-180
#transform=rotate-90
# 缩放
scale=2
```

weston.ini 配置文件的详细说明，可参考 [^4]

### 开机启动

Jetson 默认会从 Ubuntu 图形界面启动，我们需要设置默认不进入图形界面：

```bash
# 默认不进入图形界面
sudo systemctl set-default multi-user.target

# 默认进入图形界面
# sudo systemctl set-default graphical.target

# 如果设置了默认不进入图形界面，可以手动进入图形界面：
# sudo systemctl start gdm3.service
```

创建启动脚本 `weston-autostart.sh` :

```bash
#!/bin/bash

# Set up the environment and directory permissions:
unset DISPLAY
mkdir -p /tmp/xdg
chmod 700 /tmp/xdg

# set xdg runtime dir
export XDG_RUNTIME_DIR=/tmp/xdg

# start weston
nvstart-weston.sh

# wait for weston to start
sleep 3

# set display
export DISPLAY=:0

# start material_3_demo
/path/your/app
```

创建 systemd 服务 `/etc/systemd/system/weston-autostart.service`：

```ini
[Unit]
Description=Weston autostart
After=systemd-user-sessions.service

[Service]
Type=simple
ExecStart=/path/your/weston-autostart.sh
#Restart=on-failure
#RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Raspberry Pi (待完善)

### 安装 Weston

```bash
sudo apt update
sudo apt install weston
```

### 配置

创建 `/etc/xdg/weston/weston.ini` 文件，添加以下内容：

```ini
[core]
idle-time=0
repaint-window=8

[output]
name=HDMI-A-1
#mode=3840x2160
#mode=1920x1080
#transform=flipped-180
#transform=rotate-90
#scale=2
```

### 启动

```bash
mkdir -p /tmp/xdg
sudo XDG_RUNTIME_DIR=/tmp/xdg weston --idle-time=0 --tty=1
```

[^1]: https://wayland.pages.freedesktop.org/weston/index.html
[^2]: https://wiki.archlinuxcn.org/wiki/Weston
[^3]: https://docs.nvidia.com/jetson/archives/r36.4.3/DeveloperGuide/SD/WindowingSystems/WestonWayland.html
[^4]: https://man.archlinux.org/man/weston.ini.5
