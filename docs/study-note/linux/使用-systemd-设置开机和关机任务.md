# 使用 systemd 设置开机和关机任务

systemd 是现代 Linux 系统中的初始化系统和系统管理器，它提供了全面的解决方案来管理系统启动和关机过程。通过配置 systemd 服务单元，我们可以轻松设置开机和关机时执行的任务。

## 1. 开机任务

systemd 使用"单元（Unit）"的概念来管理系统资源和服务。对于开机任务，我们主要关注 service 类型的单元。

### systemd 启动流程简介

在深入了解开机任务配置前，先简要了解 systemd 的启动流程：

1. BIOS/UEFI 初始化 → 引导加载程序 → 内核加载
2. 内核初始化完成后，启动 PID 1 进程（systemd）
3. systemd 读取目标单元配置，按依赖关系启动各个服务
4. 启动流程：`sysinit.target` → `basic.target` → `network.target` → `multi-user.target` → `graphical.target`

### 创建一个 basic.target 之后执行的任务

下面是一个在 `basic.target` 之后执行的任务示例：

1. 创建服务文件：

```bash
sudo nano /etc/systemd/system/my-startup-task.service
```

2. 添加详细配置内容：

```ini
[Unit]
Description=My Custom Startup Task
Documentation=https://example.com/documentation
# 确保在基本系统启动后运行
After=basic.target
# 依赖 basic.target 但不强制要求成功
Wants=basic.target
# 如果需要网络连接，可以改为
# After=network.target
# Wants=network.target

[Service]
# 服务类型：一次性执行
Type=oneshot
# 重启策略：不自动重启
Restart=no
# 启动超时时间（秒）
TimeoutStartSec=30
# 可以设置工作目录
WorkingDirectory=/tmp
# 设置环境变量
Environment="VARIABLE1=value1" "VARIABLE2=value2"
# 可以指定用户和组
User=root
Group=root
# 启动前执行的命令
ExecStartPre=/bin/mkdir -p /var/log/my-task
# 主要启动命令
ExecStart=/path/to/your/script.sh
# 或者直接执行命令
# ExecStart=/bin/bash -c "echo 'System started at $(date)' >> /var/log/boot-log.txt"
# 启动后执行的命令
ExecStartPost=/bin/chmod 644 /var/log/boot-log.txt

[Install]
# 定义何时启动该服务
WantedBy=basic.target
```

3. 创建执行脚本（如果使用脚本）：

```bash
sudo nano /path/to/your/script.sh
```

脚本内容示例：

```bash
#!/bin/bash
# 记录启动时间
echo "System started at $(date)" >> /var/log/boot-log.txt

# 执行一些启动任务
# 例如：清理临时文件
find /tmp -type f -atime +7 -delete

# 检查并挂载某些文件系统
if ! grep -qs '/mnt/data' /proc/mounts; then
    mount /mnt/data
fi

# 启动某些应用程序
# su - username -c "cd /path/to/app && ./start.sh"

exit 0
```

4. 设置脚本权限：

```bash
sudo chmod +x /path/to/your/script.sh
```

5. 启用并测试服务：

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启用服务以便开机自动启动
sudo systemctl enable my-startup-task.service

# 立即启动服务进行测试
sudo systemctl start my-startup-task.service

# 检查服务状态
sudo systemctl status my-startup-task.service
```

### service 文件的关键配置说明

service 文件通常包含三个主要部分：`[Unit]`、`[Service]` 和 `[Install]`。每个部分包含多个配置项，下面详细解释：

#### [Unit] 部分

- **Description**：服务的简短描述，显示在 systemctl status 命令输出中
- **Documentation**：指向文档的 URL 或路径，方便管理员查阅
- **After**：指定本服务在哪些单元之后启动，确保依赖的服务先启动完成
  - 例：`After=network.target syslog.target`
- **Before**：指定哪些单元应该在本服务之后启动
- **Wants**：表示弱依赖关系，如果指定的单元启动失败，本服务仍会启动
- **Requires**：表示强依赖关系，如果指定的单元启动失败，本服务不会启动
- **Conflicts**：指定与本服务冲突的单元，如果这些单元正在运行，本服务将不会启动
- **ConditionPathExists**：只有当指定路径存在时才启动服务
  - 例：`ConditionPathExists=/opt/application`
- **ConditionPathIsDirectory**：只有当指定路径是目录时才启动服务
- **ConditionFileNotEmpty**：只有当指定文件不为空时才启动服务

#### [Service] 部分

- **Type**：定义服务的启动类型，影响 systemd 如何判断服务已成功启动
  - `simple`（默认）：主进程启动后立即视为服务启动完成
  - `oneshot`：执行一次性命令，完成后退出，适合启动脚本类任务
  - `forking`：服务使用 fork() 创建子进程后退出，子进程成为主进程，适合传统守护进程
  - `dbus`：服务通过 D-Bus 通知系统已就绪
  - `notify`：服务通过 sd_notify() 函数通知系统已就绪
  - `idle`：类似 simple，但会等到其他作业完成后才启动
- **ExecStart**：启动服务时执行的命令，必须是绝对路径
- **ExecStartPre**：在 ExecStart 之前执行的命令，可以有多行
- **ExecStartPost**：在 ExecStart 之后执行的命令，可以有多行
- **ExecStop**：停止服务时执行的命令
- **ExecReload**：重新加载服务时执行的命令
- **Restart**：定义服务退出后是否自动重启
  - 选项：`no`, `on-success`, `on-failure`, `on-abnormal`, `on-abort`, `on-watchdog`, `always`
- **RestartSec**：重启前等待的秒数
- **TimeoutStartSec**：启动超时时间，超过此时间未启动完成则视为失败
- **TimeoutStopSec**：停止超时时间，超过此时间未停止则会强制终止
- **User/Group**：指定运行服务的用户和组
- **WorkingDirectory**：指定工作目录
- **Environment**：设置环境变量
- **EnvironmentFile**：从文件中读取环境变量
- **Nice**：设置进程优先级，值范围 -20（最高）到 19（最低）
- **OOMScoreAdjust**：调整 OOM killer 评分，范围 -1000 到 1000
- **LimitNOFILE**：限制打开文件描述符数量
- **PrivateTmp**：是否使用私有的 /tmp 目录，增加安全性

#### [Install] 部分

- **WantedBy**：定义服务应该在哪个 target 启动时启动，最常用
  - 例：`WantedBy=multi-user.target`
- **RequiredBy**：定义哪些 target 强依赖本服务
- **Also**：指定当启用本服务时，同时启用哪些其他单元
- **Alias**：为服务创建别名

### 对比不同启动阶段的详细介绍

systemd 采用"目标（target）"的概念代替了传统的运行级别。不同 target 表示系统的不同状态或启动阶段。以下是主要的 target 单元及其详细说明：

#### sysinit.target
- **启动时机**：系统最早的启动阶段之一
- **主要任务**：
  - 挂载 `/sys`, `/proc` 等虚拟文件系统
  - 设置主机名
  - 初始化随机数生成器
  - 加载内核模块
  - 设置 SELinux
  - 启动 udev
- **适合场景**：需要在系统初始化最早阶段执行的任务，通常用于硬件初始化相关操作
- **需注意**：此时许多系统资源尚未就绪，如文件系统可能处于只读状态

#### basic.target
- **启动时机**：sysinit.target 之后
- **主要任务**：
  - 完成基本文件系统挂载
  - 初始化日志服务
  - 设置系统时钟
  - 激活 LVM 卷和软件 RAID
  - 挂载所有非系统存储设备
- **适合场景**：需要完整文件系统访问但不需要网络的任务
- **示例用途**：
  - 清理临时文件
  - 检查磁盘健康状态
  - 初始化本地数据库

#### network.target
- **启动时机**：basic.target 之后
- **主要任务**：
  - 初始化网络接口
  - 分配 IP 地址
  - 设置路由表
- **适合场景**：需要网络连接的服务和任务
- **需注意**：此 target 仅表示网络栈已初始化，不保证网络连接已经可用

#### network-online.target
- **启动时机**：network.target 之后
- **主要任务**：确保网络实际可用
- **适合场景**：严格依赖网络连接的服务，如网络文件系统挂载、远程数据库连接等

#### multi-user.target
- **启动时机**：network.target 之后
- **主要任务**：
  - 启动系统关键服务
  - 启动用户登录服务（如 SSH）
  - 大多数常规服务都在这个阶段启动
- **适合场景**：大多数普通服务和守护进程
- **对应传统**：相当于传统 SysV init 中的运行级别 3

#### graphical.target
- **启动时机**：multi-user.target 之后
- **主要任务**：
  - 启动图形环境
  - 启动显示管理器
  - 提供图形登录界面
- **适合场景**：依赖图形环境的服务或应用
- **对应传统**：相当于传统 SysV init 中的运行级别 5

#### 选择合适的启动阶段的建议

- 如果任务需要完整的文件系统但不需要网络：`basic.target`
- 如果任务需要网络栈但不一定需要网络连接：`network.target`
- 如果任务严格依赖网络连接成功：`network-online.target`
- 大多数服务通常应该使用：`multi-user.target`
- 需要图形环境的应用：`graphical.target`

可以使用以下命令查看 target 之间的依赖关系：

```bash
systemctl list-dependencies multi-user.target
```

## 2. 关机任务

与启动任务类似，systemd 也允许我们在系统关机时执行特定任务，例如备份数据、清理缓存或发送通知等。

### 创建一个关机执行的任务详细步骤

1. 创建服务文件：

```bash
sudo nano /etc/systemd/system/my-shutdown-task.service
```

2. 添加详细配置内容：

```ini
[Unit]
Description=My Custom Shutdown Task
Documentation=https://example.com/documentation
# 禁用默认依赖关系，这对于关机服务非常重要，否则服务可能在依赖关系处理过程中被过早终止
DefaultDependencies=no
# 确保在关机前执行
Before=shutdown.target reboot.target halt.target
# 如果需要在数据库等服务关闭前执行，可以添加
# After=mysqld.service postgresql.service
# 确保挂载点仍然可用
Requires=-.mount
After=-.mount
# 冲突设置，确保不会在系统启动时执行
Conflicts=reboot.target

[Service]
# 服务类型：一次性执行
Type=oneshot
# 关机任务通常使用 ExecStop 执行
ExecStart=/bin/true
# 这是关键：在系统关闭时执行的实际命令
ExecStop=/path/to/your/shutdown-script.sh
# 或者直接执行命令
# ExecStop=/bin/bash -c "echo 'System shutting down at $(date)' >> /var/log/shutdown-log.txt"
# 这个设置是关键，即使 ExecStart 执行完毕，服务也视为活动状态，确保 ExecStop 可以被调用
RemainAfterExit=yes
# 设置超时时间，防止关机过程被过长的关机脚本延迟
TimeoutStopSec=120
# 可以指定用户和组
User=root
Group=root
# 可以设置工作目录
WorkingDirectory=/var/log
# 设置环境变量
Environment="SHUTDOWN_TYPE=normal" "LOG_LEVEL=info"

[Install]
# 将服务关联到关机目标
WantedBy=shutdown.target
```

3. 创建关机脚本：

```bash
sudo nano /path/to/your/shutdown-script.sh
```

脚本内容示例：

```bash
#!/bin/bash
# 记录关机时间
echo "System shutting down at $(date)" >> /var/log/shutdown-log.txt

# 执行数据备份
BACKUP_DIR="/var/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
mysqldump --all-databases > "$BACKUP_DIR/all-databases.sql" 2>/dev/null || true

# 同步未写入的文件系统数据
sync

# 清理临时文件
find /tmp -type f -delete 2>/dev/null || true

# 发送关机通知
if command -v mail &>/dev/null; then
    echo "System $(hostname) is shutting down at $(date)" | mail -s "System shutdown" admin@example.com
fi

# 记录服务状态
systemctl list-units --state=running --no-pager > "$BACKUP_DIR/running-services.txt" 2>/dev/null || true

exit 0
```

4. 设置脚本权限：

```bash
sudo chmod +x /path/to/your/shutdown-script.sh
```

5. 启用并测试服务：

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启用服务
sudo systemctl enable my-shutdown-task.service

# 启动服务（这样系统关机时才会执行 ExecStop）
sudo systemctl start my-shutdown-task.service

# 检查服务状态
sudo systemctl status my-shutdown-task.service

# 模拟测试关机脚本（不实际关机）
sudo /path/to/your/shutdown-script.sh
```

### service 文件的关键配置详解

关机任务的 service 文件配置与普通服务有一些重要区别：

#### DefaultDependencies=no
- **重要性**：对关机服务至关重要
- **作用**：防止 systemd 自动添加默认依赖关系
- **原因**：默认依赖会导致服务在关机过程中的依赖处理中被过早关闭，可能导致关机脚本无法执行

#### Before=shutdown.target
- **重要性**：确保顺序正确
- **作用**：指定本服务必须在 shutdown.target 激活前完成
- **相关场景**：可以添加多个 Before 指令，确保在多种关机场景下都能执行
  - `Before=shutdown.target reboot.target halt.target poweroff.target`

#### RemainAfterExit=yes
- **重要性**：关键配置，不可省略
- **作用**：即使 ExecStart 命令执行完成，服务也被视为"活动"状态
- **原因**：只有处于活动状态的服务，其 ExecStop 命令才会在系统关机时执行

#### ExecStart=/bin/true
- **用途**：提供一个简单的、总是成功的启动命令
- **作用**：确保服务能成功启动并保持活动状态
- **替代方案**：可以在此处放置一些系统启动时的初始化命令

#### ExecStop
- **重要性**：真正执行关机任务的命令
- **执行时机**：当系统关机或服务停止时执行
- **注意事项**：
  - 应设置合理的超时时间（TimeoutStopSec）
  - 脚本应处理异常情况并及时退出
  - 避免执行可能卡住的操作

#### WantedBy=shutdown.target
- **作用**：指定当系统关机时，此服务应被激活
- **替代选项**：
  - `WantedBy=reboot.target`：仅在重启时激活
  - `WantedBy=poweroff.target`：仅在关机时激活

### 关机相关 target 详细介绍

systemd 定义了几个与关机过程相关的 target 单元，理解它们的区别和联系对于配置关机任务非常重要：

#### shutdown.target
- **作用**：所有关机路径的通用目标
- **执行流程**：
  1. 停止所有活动服务
  2. 卸载所有文件系统
  3. 停止所有系统进程
- **特点**：是 reboot、poweroff 和 halt target 的依赖
- **适用场景**：想要在任何类型的关机过程中执行的任务
- **配置示例**：
  ```ini
  Before=shutdown.target
  WantedBy=shutdown.target
  ```

#### reboot.target
- **作用**：专门负责系统重启
- **执行命令**：`systemctl reboot` 或 `reboot`
- **特点**：包含了重启特有的操作，如设置特定的重启参数
- **依赖关系**：依赖 shutdown.target
- **适用场景**：只想在系统重启时执行的任务
- **配置示例**：
  ```ini
  Before=reboot.target
  WantedBy=reboot.target
  ```

#### poweroff.target
- **作用**：负责完全关闭系统电源
- **执行命令**：`systemctl poweroff` 或 `poweroff`
- **特点**：会发送 ACPI 信号给硬件，通知其切断电源
- **依赖关系**：依赖 shutdown.target
- **适用场景**：只想在系统完全关闭时执行的任务
- **配置示例**：
  ```ini
  Before=poweroff.target
  WantedBy=poweroff.target
  ```

#### halt.target
- **作用**：负责停止系统但不关闭电源
- **执行命令**：`systemctl halt` 或 `halt`
- **特点**：停止所有进程和服务，但不发送电源关闭信号
- **历史来源**：对应传统 SysV 系统中的 `halt` 命令
- **依赖关系**：依赖 shutdown.target
- **适用场景**：较少使用，多用于特定的维护或诊断场景
- **配置示例**：
  ```ini
  Before=halt.target
  WantedBy=halt.target
  ```

#### kexec.target
- **作用**：通过 kexec 系统调用直接加载新内核
- **执行命令**：`systemctl kexec`
- **特点**：绕过 BIOS/UEFI 重新启动，实现更快的重启
- **适用场景**：需要快速重启进入另一个内核（如灾难恢复）

#### 不同 target 的执行流程和相互关系

```
                      ┌─ kexec.target
                      │
shutdown.target ──────┼─ reboot.target
                      │
                      ├─ poweroff.target
                      │
                      └─ halt.target
```

所有这些 target 都依赖 shutdown.target，因此一般情况下，将自定义关机服务关联到 shutdown.target 就足够了，这样可以确保在任何类型的关机过程中都执行关机任务。如果需要对不同关机类型执行不同的操作，才需要针对特定的 target 设置。

可以使用以下命令查看关机相关 target 的依赖关系：

```bash
systemctl list-dependencies shutdown.target
systemctl list-dependencies --reverse shutdown.target
```

## 应用场景示例

### 1. 创建一个网络可用后执行的开机任务

```ini
[Unit]
Description=Service that runs after network is online
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/network-dependent-script.sh
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### 2. 创建一个数据库备份的关机任务

```ini
[Unit]
Description=Backup databases before shutdown
DefaultDependencies=no
After=mysqld.service postgresql.service
Before=shutdown.target
Conflicts=reboot.target

[Service]
Type=oneshot
ExecStart=/bin/true
ExecStop=/usr/local/bin/backup-databases.sh
RemainAfterExit=yes
TimeoutStopSec=120

[Install]
WantedBy=shutdown.target
```

### 3. 创建一个条件性启动的服务

```ini
[Unit]
Description=Service that only runs when a specific device is present
ConditionPathExists=/dev/sdb1
After=basic.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mount-and-process-external-drive.sh

[Install]
WantedBy=multi-user.target
```

## 调试与故障排除

### 检查服务状态和日志

```bash
# 检查服务状态
sudo systemctl status my-startup-task.service
sudo systemctl status my-shutdown-task.service

# 查看服务日志
sudo journalctl -u my-startup-task.service
sudo journalctl -u my-shutdown-task.service

# 查看启动/关机相关的所有日志
sudo journalctl -b -o short-precise | grep shutdown
sudo journalctl -b -1 -o short-precise  # 查看上一次启动的日志
```

### 常见问题及解决方案

1. **服务不自动启动**
   - 检查是否已启用：`systemctl is-enabled my-service`
   - 检查单元文件语法：`systemd-analyze verify /etc/systemd/system/my-service.service`
   - 检查依赖是否满足：`systemctl list-dependencies --all my-service`

2. **关机脚本没有执行**
   - 确认 `DefaultDependencies=no` 设置正确
   - 确认 `RemainAfterExit=yes` 设置正确
   - 确认服务已启动：`systemctl start my-shutdown-task`
   - 检查服务状态是否为活动：`systemctl is-active my-shutdown-task`

3. **服务执行超时**
   - 适当调整 TimeoutStartSec 和 TimeoutStopSec 值
   - 检查脚本是否有死循环或长时间等待

4. **权限问题**
   - 检查脚本权限：`ls -l /path/to/script.sh`
   - 检查 User/Group 设置是否正确
   - 使用 `su` 或 `sudo -u` 测试用户是否有执行权限

## 最后

通过 systemd，我们可以精确控制系统启动和关闭过程中执行的任务。掌握 systemd 服务单元的配置方法，特别是 Unit、Service 和 Install 部分的关键选项，可以帮助我们创建更加可靠和高效的系统管理脚本。

关键注意事项：
1. 选择合适的启动阶段（target）对任务的成功执行至关重要
2. 关机服务必须设置 `DefaultDependencies=no` 和 `RemainAfterExit=yes`
3. 脚本应当处理异常情况并设置合理的超时时间
4. 对于关键服务，应当通过日志和通知机制记录执行结果

有了这些知识，你可以灵活地配置各种系统任务，提高系统的自动化程度和可维护性。

```bash
# 有用的命令速查
# 列出所有活动的 target
systemctl list-units --type=target

# 查看默认 target
systemctl get-default

# 切换运行级别
systemctl isolate multi-user.target

# 设置默认运行级别
systemctl set-default multi-user.target

# 分析启动时间
systemd-analyze blame
```
