# 开启 BBR 拥塞控制算法

## 1. 简要介绍 BBR

BBR (Bottleneck Bandwidth and Round-trip propagation time) 是 Google 开发的一种 TCP 拥塞控制算法，于2016年首次发布。与传统算法如CUBIC不同，BBR通过主动测量网络路径的带宽和往返时间(RTT)来动态调整发送速率，从而更有效地利用网络带宽。

主要特点：
- 减少缓冲区膨胀(bufferbloat)
- 提高网络吞吐量
- 降低延迟
- 在高丢包环境下表现更好

BBR算法自Linux 4.9内核开始被纳入主线内核，成为Linux系统内置的拥塞控制算法之一。

## 2. 验证是否已开启

在尝试开启BBR之前，我们可以先检查系统是否已经启用了BBR算法。

### 检查当前拥塞控制算法
```bash
sysctl net.ipv4.tcp_congestion_control
```

或者
```bash
cat /proc/sys/net/ipv4/tcp_congestion_control
```

### 检查BBR模块是否可用
```bash
lsmod | grep bbr
```

如果输出中包含"tcp_bbr"，则表示BBR模块已加载。

### 检查内核版本
```bash
uname -r
```

确保内核版本≥4.9，因为BBR需要至少4.9版本的内核。

## 3. 开启BBR

如果系统尚未启用BBR，可以按照以下步骤手动开启：

### 1. 加载BBR模块
```bash
modprobe tcp_bbr
```

### 2. 设置BBR为默认拥塞控制算法
```bash
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
```

### 3. 应用配置
```bash
sysctl -p
```

### 4. 验证是否生效
```bash
sysctl net.ipv4.tcp_congestion_control
# 应该输出: net.ipv4.tcp_congestion_control = bbr

sysctl net.core.default_qdisc
# 应该输出: net.core.default_qdisc = fq

lsmod | grep bbr
# 应该看到tcp_bbr模块
```

## 4. 自动开启BBR的脚本

以下是一个自动检测和开启BBR的bash脚本：

```bash
#!/bin/bash

# 检查是否为root用户
if [ "$(id -u)" != "0" ]; then
   echo "此脚本必须以root用户身份运行" >&2
   exit 1
fi

# 检查内核版本是否支持BBR
KERNEL_MAJOR=$(uname -r | cut -d'.' -f1)
KERNEL_MINOR=$(uname -r | cut -d'.' -f2)
if [ "$KERNEL_MAJOR" -lt 4 ] || { [ "$KERNEL_MAJOR" -eq 4 ] && [ "$KERNEL_MINOR" -lt 9 ]; }; then
    echo "错误: 内核版本需要4.9或更高版本才能支持BBR" >&2
    exit 1
fi

# 检查是否已启用BBR
CURRENT_CC=$(sysctl -n net.ipv4.tcp_congestion_control)
if [ "$CURRENT_CC" == "bbr" ]; then
    echo "BBR已经启用"
    exit 0
fi

# 启用BBR
echo "正在启用BBR..."
{
    echo "net.core.default_qdisc=fq"
    echo "net.ipv4.tcp_congestion_control=bbr"
} >> /etc/sysctl.conf

# 加载模块
modprobe tcp_bbr

# 应用设置
sysctl -p >/dev/null 2>&1

# 验证
NEW_CC=$(sysctl -n net.ipv4.tcp_congestion_control)
if [ "$NEW_CC" == "bbr" ]; then
    echo "BBR已成功启用"
else
    echo "启用BBR失败" >&2
    exit 1
fi

exit 0
```

### 使用说明：
1. 将上述脚本保存为`enable_bbr.sh`
2. 给予执行权限：`chmod +x enable_bbr.sh`
3. 以root身份运行：`sudo ./enable_bbr.sh`

### 注意事项：
- 脚本会自动检查内核版本是否支持BBR
- 如果已经启用BBR，脚本会直接退出
- 启用后需要重启网络应用或系统才能完全生效
- 在某些云服务商的VPS上可能需要额外的配置

启用BBR后，您应该能够体验到网络性能的提升，特别是在高延迟或高丢包的网络环境中。
