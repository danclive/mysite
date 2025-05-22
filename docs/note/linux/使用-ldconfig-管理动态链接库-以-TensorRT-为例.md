# 使用 ldconfig 管理动态链接库,以 TensorRT 为例

在 Linux 系统中，`ldconfig` 是一个用于配置动态链接器运行时绑定的工具。要将 TensorRT 或其他动态库添加到系统的可加载路径中，可以按照以下步骤操作：

### **1. 确认动态库的存放位置**
首先，确保 TensorRT 的动态库（`.so` 文件）已经安装在某个目录下。例如，我们[下载](https://developer.nvidia.com/tensorrt/download) TensorRT 的安装文件 (Tar File), 解压后放到 `/user/local` 目录下：

```bash
ls /usr/local/TensorRT-10.10.0.31
>> bin  data  doc  include  lib  python  samples  targets
```

或者自定义路径如：

```bash
/home/yourname/TensorRT-10.10.0.31
```

### **2. 将库路径添加到系统配置**

#### **方法一：临时生效（重启后失效）**

直接运行 `ldconfig` 并指定库路径：

```bash
sudo ldconfig /usr/local/TensorRT-10.10.0.31/lib
```

#### **方法二：永久生效**

将库路径添加到系统的配置文件：

1. 创建一个新的 `.conf` 文件（如 `tensorrt.conf`）在 `/etc/ld.so.conf.d/` 目录：

   ```bash
   sudo nano /etc/ld.so.conf.d/tensorrt.conf
   ```

2. 在文件中写入 TensorRT 库的绝对路径：

   ```plaintext
   /usr/local/TensorRT-10.10.0.31/lib
   ```

   保存并退出（`Ctrl+O` → `Enter` → `Ctrl+X`）。

3. 更新动态链接器的缓存：

   ```bash
   sudo ldconfig
   ```

### **3. 验证是否生效**

- 检查 `ldconfig` 缓存中是否包含 TensorRT 的库：

  ```bash
  ldconfig -p | grep nvinfer
  ```

  如果看到类似输出，说明配置成功：

  ```plaintext
  ...
  libnvinfer.so.10 (libc6,x86-64) => /usr/local/TensorRT-10.10.0.31/lib/libnvinfer.so.10
  libnvinfer.so (libc6,x86-64) => /usr/local/TensorRT-10.10.0.31/lib/libnvinfer.so
  ...
  ```

- 如果程序仍然找不到库，可以手动指定 `LD_LIBRARY_PATH`：

  ```bash
  export LD_LIBRARY_PATH=/usr/local/TensorRT-10.10.0.31/lib:$LD_LIBRARY_PATH
  ```

  将此行添加到 `~/.bashrc` 或 `~/.bash_profile` 以持久化。

### **4. 注意事项**

- **权限问题**：确保 `/etc/ld.so.conf.d/` 和库文件可被读取。
- **多版本冲突**：如果安装多个 TensorRT 版本，确保路径优先级正确。
- **开发环境**：编译程序时可能需要通过 `-L` 指定库路径，例如：

  ```bash
  gcc -L/usr/local/TensorRT-10.10.0.31/lib -lnvinfer -o my_app
  ```

通过以上步骤，TensorRT 的动态库将被系统识别，应用程序运行时可以正确加载。
