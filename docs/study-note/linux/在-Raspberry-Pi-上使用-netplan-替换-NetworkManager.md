# 在 Raspberry Pi 上使用 netplan 替换 NetworkManager

## 介绍

Netplan 是 Ubuntu 推出的网络配置工具，它使用 YAML 文件来描述网络接口，并能够生成适用于 NetworkManager 或 systemd-networkd 的配置。在树莓派上，默认使用 NetworkManager 管理网络，但有时我们可能希望使用更轻量级的 systemd-networkd 配合 netplan 来管理网络。

## 安装 netplan

首先，我们需要安装 netplan：

```bash
sudo apt update
sudo apt install netplan.io
```

## 禁用 NetworkManager

在切换到 netplan 前，我们需要禁用 NetworkManager：

```bash
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager
```

## 启用 systemd-networkd

确保 systemd-networkd 服务已启用并运行：

```bash
sudo systemctl enable systemd-networkd --now
```

同时，需要启用 systemd-resolved 服务用于 DNS 解析：

```bash
sudo apt install systemd-resolved
sudo systemctl enable systemd-resolved --now
```

> **注意**：安装并启动systemd-resolved后，执行`sudo resolvectl status`命令可能会超时。通常重启系统后，该命令就能正常工作。

## 卸载 dhclient（可选）

当使用 systemd-networkd 作为网络管理器时，不再需要 dhclient，因为 systemd-networkd 包含了自己的 DHCP 客户端。可以安全地卸载 dhclient：

```bash
sudo apt purge isc-dhcp-client
sudo apt autoremove
```

卸载后，系统将完全依赖 systemd-networkd 来获取 DHCP 配置。

## 创建 netplan 配置文件

netplan 配置文件通常位于 `/etc/netplan/` 目录下，文件名可以是 `01-netcfg.yaml` 或其他以 `.yaml` 结尾的文件。

创建配置文件：

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

以下是一个基本的配置示例：

### 有线网络配置示例

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
```

### 无线网络配置示例

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      optional: true
      access-points:
        "your-ssid-name":
          password: "your-wifi-password"
```

### 静态 IP 配置示例

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

## 注意配置文件权限

Netplan 对配置文件权限有严格要求，为了安全考虑，配置文件必须仅对 root 用户可写：

```bash
sudo chmod 600 /etc/netplan/01-netcfg.yaml
```

## 应用 netplan 配置

创建配置文件后，使用以下命令测试配置：

```bash
sudo netplan try
```

如果没有问题，应用配置：

```bash
sudo netplan apply
```

## 安装 Open vSwitch（可选）

如果你需要使用 Open vSwitch 功能，可以安装相关软件包：

```bash
sudo apt install openvswitch-switch
```

然后在 netplan 配置中添加 Open vSwitch 相关设置：

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  bridges:
    ovs-br0:
      interfaces: [eth0]
      dhcp4: true
      openvswitch: {}
```

## 完全移除 NetworkManager

确认网络配置工作正常后，可以完全移除 NetworkManager：

```bash
sudo apt purge network-manager
sudo apt autoremove
```

## 无线网络管理和故障排除

### 关于 wpa_supplicant

在树莓派上，wpa_supplicant 已经默认安装。使用 systemd-networkd 连接 WiFi 必须依赖 wpa_supplicant，因此**不要卸载**它：

```bash
# 检查 wpa_supplicant 是否已安装
dpkg -l | grep wpasupplicant
```

如果因某种原因未安装，可以使用以下命令安装：

```bash
sudo apt install wpasupplicant
```

### 常见无线网络问题排查

#### 检查无线网卡状态

检查无线网卡是否被硬件或软件锁定（RF-kill）：

```bash
sudo rfkill list
```

如果无线网卡被锁定，使用以下命令解锁：

```bash
sudo rfkill unblock wifi
```

#### 检查无线接口状态

查看网络接口状态：

```bash
ip a
```

如果无线接口未启动，手动启动：

```bash
sudo ip link set wlan0 up
```

#### 检查 wpa_supplicant 服务状态

确保 wpa_supplicant 服务正在运行：

```bash
sudo systemctl status wpa_supplicant
```

如果未运行，启动并启用服务：

```bash
sudo systemctl enable wpa_supplicant --now
```

#### 手动扫描无线网络

使用以下命令扫描可用的无线网络：

```bash
sudo iw dev wlan0 scan | grep SSID
```

也可以使用传统的`iwlist`命令：

```bash
sudo iwlist wlan0 scan | grep ESSID
```

> **说明**：`iw`和`iwlist`的区别：
> - `iw`是较新的命令行工具，用于配置无线设备，将逐步替代`iwconfig`和`iwlist`
> - `iwlist`是较旧的工具，但在许多系统上仍可用
> - `iw`提供更详细的信息和更多功能，但可能输出过于冗长
> - `iwlist`的输出通常更简洁易读，对快速检查更方便

#### 查看 systemd-networkd 日志

如果连接失败，查看网络管理日志：

```bash
sudo journalctl -u systemd-networkd -f
```

检查 wpa_supplicant 日志：

```bash
sudo journalctl -u wpa_supplicant -f
```

### 优化无线网络配置

#### 连接隐藏 SSID

如果需要连接隐藏的 SSID：

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      optional: true
      access-points:
        "your-hidden-ssid-name":
          password: "your-wifi-password"
          hidden: true
```

#### 设置 WiFi 优先级

通过设置权重（优先级）连接多个 WiFi：

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: true
      optional: true
      access-points:
        "home-network":
          password: "home-password"
          priority: 100
        "backup-network":
          password: "backup-password"
          priority: 50
```

优先级数值越高，优先级越高。

## 常用命令速查表

以下是本文中涉及到的各种网络管理工具的常用命令列表，方便快速查阅。

### netplan 命令

```bash
# 生成配置但不应用
sudo netplan generate

# 测试配置（有10秒确认时间）
sudo netplan try

# 应用配置
sudo netplan apply

# 获取当前配置信息
sudo netplan get
```

### networkctl 命令（systemd-networkd）

```bash
# 显示所有网络接口状态
networkctl status

# 显示特定接口详情
networkctl status wlan0

# 列出所有接口
networkctl list

# 重载网络配置
sudo networkctl reload

# 重新连接特定接口
sudo networkctl reconfigure wlan0

# 启用/禁用接口
sudo networkctl up wlan0
sudo networkctl down wlan0
```

### resolvectl 命令（systemd-resolved）

```bash
# 显示DNS解析状态
resolvectl status

# 查询特定域名
resolvectl query example.com

# 显示DNS统计信息
resolvectl statistics

# 刷新DNS缓存
sudo resolvectl flush-caches

# 重置DNS统计信息
sudo resolvectl reset-statistics

# 查看特定接口的DNS设置
resolvectl dns wlan0

# 查看DNSSEC状态
resolvectl dnssec
```

### iw/iwlist 命令（无线网络）

```bash
# 列出无线设备
iw dev

# 扫描无线网络
sudo iw dev wlan0 scan | grep SSID
sudo iwlist wlan0 scan | grep ESSID

# 连接到无线网络（仅适用于开放网络）
sudo iw dev wlan0 connect "SSID名称"

# 显示接口详情
iw dev wlan0 info

# 显示链接质量
iw dev wlan0 link

# 设置接口状态
sudo ip link set wlan0 up
sudo ip link set wlan0 down
```

### rfkill 命令（无线设备控制）

```bash
# 列出所有无线设备状态
rfkill list

# 启用所有WiFi设备
sudo rfkill unblock wifi

# 禁用所有WiFi设备
sudo rfkill block wifi

# 启用特定设备（n为设备号）
sudo rfkill unblock n

# 禁用特定设备
sudo rfkill block n
```

### systemd 服务管理命令

```bash
# 查看服务状态
systemctl status systemd-networkd
systemctl status systemd-resolved
systemctl status wpa_supplicant

# 启动服务
sudo systemctl start systemd-networkd

# 停止服务
sudo systemctl stop systemd-networkd

# 启用开机自启并立即启动
sudo systemctl enable --now systemd-networkd

# 禁用服务
sudo systemctl disable systemd-networkd

# 查看服务日志
journalctl -u systemd-networkd -f
journalctl -u wpa_supplicant -f
```

## 参考资料

- [Netplan 官方文档](https://netplan.io/reference)
- [systemd-networkd 文档](https://www.freedesktop.org/software/systemd/man/systemd-networkd.service.html)
