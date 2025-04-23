# WireGuard 使用指南

WireGuard 是一种简单高效的现代虚拟网络技术。本指南将介绍如何使用 WireGuard 搭建一个允许两台没有公网 IP 的计算机通过一台有公网 IP 的服务器相互连接的网络。

## 网络拓扑

在本指南中，我们有以下设备：
- 一台有公网 IP 的服务器（称为 Server）
- 两台没有公网 IP 的客户端电脑（称为 Client1 和 Client2）

我们的目标是让 Client1 和 Client2 能够相互访问。通过将 Server 配置为 WireGuard 中继服务器，我们可以实现这一目标。

```bash
[Client1 (无公网IP)] <---> [Server (有公网IP)] <---> [Client2 (无公网IP)]
```

## 安装 WireGuard

### Ubuntu/Debian 系统

在服务器和客户端上安装 WireGuard：

```bash
sudo apt update
sudo apt install wireguard
```

## 基本配置

### 服务器配置

1. 生成服务器密钥对：

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

2. 创建服务器配置文件 `/etc/wireguard/wg0.conf`：

```bash
sudo nano /etc/wireguard/wg0.conf
```

配置文件内容：

```
[Interface]
PrivateKey = <服务器私钥>
Address = 10.0.0.1/24
ListenPort = 51820
SaveConfig = true

# 开启 IP 转发
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client1 配置
[Peer]
PublicKey = <Client1公钥>
AllowedIPs = 10.0.0.2/32

# Client2 配置
[Peer]
PublicKey = <Client2公钥>
AllowedIPs = 10.0.0.3/32
```

注意事项：
- 将 `<服务器私钥>` 替换为刚才生成的服务器私钥（`cat privatekey`）
- 将 `eth0` 替换为您服务器的实际网络接口名称（可通过 `ip a` 查看）
- 稍后我们会添加客户端的公钥

### 客户端配置

#### Client1 配置

1. 生成客户端密钥对：

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

2. 创建客户端配置文件 `/etc/wireguard/wg0.conf`：

```bash
sudo nano /etc/wireguard/wg0.conf
```

配置文件内容：

```
[Interface]
PrivateKey = <Client1私钥>
Address = 10.0.0.2/24

[Peer]
PublicKey = <服务器公钥>
Endpoint = <服务器公网IP>:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

注意事项：
- 将 `<Client1私钥>` 替换为刚才生成的客户端私钥（`cat privatekey`）
- 将 `<服务器公钥>` 替换为服务器的公钥（`cat publickey`）
- 将 `<服务器公网IP>` 替换为服务器的公网 IP 地址
- `AllowedIPs = 10.0.0.0/24` 表示只有目标IP在10.0.0.0/24网段的流量会通过WireGuard网络。如果想要所有流量都通过服务器转发（全局代理模式），应修改为：`AllowedIPs = 0.0.0.0/0, ::/0`

#### Client2 配置

1. 生成客户端密钥对：

```bash
cd /etc/wireguard
sudo umask 077
sudo wg genkey | sudo tee privatekey | sudo wg pubkey > publickey
```

2. 创建客户端配置文件 `/etc/wireguard/wg0.conf`：

```bash
sudo nano /etc/wireguard/wg0.conf
```

配置文件内容：

```
[Interface]
PrivateKey = <Client2私钥>
Address = 10.0.0.3/24

[Peer]
PublicKey = <服务器公钥>
Endpoint = <服务器公网IP>:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

注意事项：
- 将 `<Client2私钥>` 替换为刚才生成的客户端私钥（`cat privatekey`）
- 将 `<服务器公钥>` 替换为服务器的公钥（`cat publickey`）
- 将 `<服务器公网IP>` 替换为服务器的公网 IP 地址
- `AllowedIPs = 10.0.0.0/24` 表示只有目标IP在10.0.0.0/24网段的流量会通过WireGuard网络。如果想要所有流量都通过服务器转发（全局代理模式），应修改为：`AllowedIPs = 0.0.0.0/0, ::/0`

### 更新服务器配置

现在我们有了客户端的公钥，需要更新服务器的配置文件。在服务器上打开 `/etc/wireguard/wg0.conf`，并用实际的客户端公钥替换 `<Client1公钥>` 和 `<Client2公钥>`。

> **密钥管理提示**：由于我们在服务器和客户端使用相同文件名 `privatekey` 和 `publickey` 生成密钥，为避免混淆，建议在生成后立即将密钥内容复制到配置文件中，或者将密钥文件重命名（例如 `client1_privatekey`、`client1_publickey` 等）以便于管理多个客户端。

## 开启内核 IP 转发

在服务器上启用 IP 转发，这是让客户端之间能相互通信的关键步骤：

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

要使此设置在重启后仍然生效，请编辑 `/etc/sysctl.conf` 文件：

```bash
sudo nano /etc/sysctl.conf
```

添加或取消注释以下行：

```
net.ipv4.ip_forward=1
```

## 启动 WireGuard

### 服务器启动

```bash
sudo wg-quick up wg0
```

设置开机自启：

```bash
sudo systemctl enable wg-quick@wg0
```

### 客户端启动

在 Client1 和 Client2 上分别执行：

```bash
sudo wg-quick up wg0
```

同样地，如果需要设置开机自启：

```bash
sudo systemctl enable wg-quick@wg0
```

## 查看和管理连接

### 查看 WireGuard 状态

```bash
sudo wg show
```

这将显示当前的 WireGuard 连接状态，包括对等点的信息、最近的握手时间、传输的数据量等。

### 停止 WireGuard

```bash
sudo wg-quick down wg0
```

### 重新加载配置

如果修改了配置文件，可以重新加载：

```bash
sudo wg-quick down wg0
sudo wg-quick up wg0
```

或者使用 systemd：

```bash
sudo systemctl restart wg-quick@wg0
```

## 测试连接

一旦 WireGuard 在所有设备上都启动了，您可以测试连接：

1. 在 Client1 上，ping Client2 的 WireGuard IP：

```bash
ping 10.0.0.3
```

2. 在 Client2 上，ping Client1 的 WireGuard IP：

```bash
ping 10.0.0.2
```

如果一切配置正确，两个客户端应该能够相互通信。

## 配置全局流量转发

默认配置下，客户端只会通过WireGuard隧道路由10.0.0.0/24网段内的流量，即只有访问其他WireGuard节点的流量会通过WireGuard网络。

如果希望将客户端的所有流量都通过服务器转发（例如用于访问被限制的网络资源或增强隐私保护），可以修改客户端配置文件中的`AllowedIPs`参数：

```
[Peer]
PublicKey = <服务器公钥>
Endpoint = <服务器公网IP>:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```

修改说明：
- `0.0.0.0/0`表示所有IPv4流量
- `::/0`表示所有IPv6流量
- 通过这个设置，客户端所有的网络流量都会通过WireGuard隧道转发到服务器，再由服务器转发到目标地址

> **注意**：启用全局流量转发后，客户端的所有网络活动都将通过VPN服务器，这可能会影响网络性能。确保服务器有足够的带宽和处理能力来处理增加的流量。

## DNS配置说明

WireGuard配置中的DNS设置会直接影响客户端的DNS解析行为：

1. **仅转发WireGuard网络内流量时**：如果你只希望通过WireGuard转发特定网段（如10.0.0.0/24）的流量，建议**不设置DNS**，这样可以保持本地网络的DNS正常工作，避免systemd-resolved出现异常。

2. **全局转发流量时**：如果设置了`AllowedIPs = 0.0.0.0/0, ::/0`进行全局流量转发，此时通常**需要设置DNS**（如`DNS = 8.8.8.8`），确保所有DNS查询也通过VPN隧道，防止DNS泄漏，增强隐私保护。

可以根据自己的使用需求选择是否配置DNS。

## 故障排除

1. 连接问题：
   - 确保服务器防火墙允许 UDP 51820 端口
   - 检查服务器是否正确启用了 IP 转发
   - 验证所有配置文件中的公钥是否正确

2. 无法互相访问：
   - 确认 AllowedIPs 设置正确
   - 检查服务器的 PostUp 和 PostDown 规则是否正确设置
   - 确保服务器的 IP 转发已启用
