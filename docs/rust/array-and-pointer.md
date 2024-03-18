# 数组与指针

这一节主要介绍 Rust 数组与指针的相关概念。希望通过本文，你对 Rust 有更深入的了解。

## 什么是数组？

数组是一组包含相同数据类型 `T` 的集合，存储在连续的内存区域中。理论上，内存（我们暂且不去讨论物理内存与虚拟内存）相当于一个类型为 `u8`、长度为 `usize` 的数组，内存操作相当于操作这个数组。因此，`usize` 可以表示每个内存地址。Rust 又规定，`isize` 的最大值是对象和数组大小的理论上限，这样可以确保 `isize` 可用于计算指向对象和数组的指针之间的差异，并可寻址对象中的每个字节及末尾的一个字节。

数组使用 `[]` 来创建，其大小在编译期间就已经确定，数组的类型被标记为 `[T; size]`，表示一个类型为 `T`，`size`个元素的数组。数组的大小是固定的，但其中的元素是可以被更改的。
接下来，我们创建一个类型为 `i32`，长度为8的数组，修改几个元素，并返回长度：

```rust
fn main() {
    let mut array: [i32; 8] = [0; 8];

    array[0] = 123;
    array[1] = 456;
    array[7] = 789;

    let len = array.len();
}
```

我们将其编译为汇编：

```sh
core::slice::<impl [T]>::len:
  sub rsp, 16
  mov qword ptr [rsp], rdi
  mov qword ptr [rsp + 8], rsi
  mov rax, qword ptr [rsp + 8]
  add rsp, 16
  ret

example::main:
  sub rsp, 40                     // 分配栈帧，rsp 寄存器存放当前函数的栈顶地址，
  lea rax, [rsp + 8]
  xor esi, esi
  mov rcx, rax
  mov rdi, rcx
  mov edx, 32
  mov qword ptr [rsp], rax
  call memset@PLT                 // 这里调用 memset 将数组的所有元素初始化为 0
  mov dword ptr [rsp + 8], 123    // 修改数组的第1个元素
  mov dword ptr [rsp + 12], 456   // 修改数组的第2个元素
  mov dword ptr [rsp + 36], 789   // 修改数组的第7个元素
  mov rax, qword ptr [rsp]
  mov rdi, rax
  mov esi, 8                      // 数组的长度是在编译时就确定的
  call qword ptr [rip + core::slice::<impl [T]>::len@GOTPCREL]
  add rsp, 40                     // 回收栈帧
  ret
```

你不必看懂上面的汇编代码。但是我们大概可以看到，数组的长度和内存占用大小，在编译时就已经确定。`rsp + 8` 为数组的地址，`[rsp + 8]` 就是这个地址对应的内存。瞧，在高级语言中操作内存，跟汇编中操作内存，很像的!  我们可以通过偏移量（索引）去操作内存中相应位置的值。
既然编译时就确定了数组的长度，如果越界访问数组，编译器会很容易检测出来：

```rust
fn main() {
    let mut array: [i32; 8] = [0; 8];

    array[10] = 123;
}
```

```sh
 --> <source>:4:5
  |
4 |     array[10] = 123;
  |     ^^^^^^^^^ index out of bounds: the len is 8 but the index is 10
  |

  = note: `#[deny(unconditional_panic)]` on by default
```

除了 `let mut array: [i32; 8] = [0; 8];` 这种初始化数组的语法，我们还可以：

```rust
fn main() {
    let mut array: [i32; 8] = [1, 2, 3, 4, 5, 6, 7, 8];

    array[0] = 123;
    array[1] = 456;
    array[7] = 789;
}
```

编译成汇编后：

```sh
example::main:
  sub rsp, 32
  mov dword ptr [rsp], 1
  mov dword ptr [rsp + 4], 2
  mov dword ptr [rsp + 8], 3
  mov dword ptr [rsp + 12], 4
  mov dword ptr [rsp + 16], 5
  mov dword ptr [rsp + 20], 6
  mov dword ptr [rsp + 24], 7
  mov dword ptr [rsp + 28], 8
  mov dword ptr [rsp], 123
  mov dword ptr [rsp + 4], 456
  mov dword ptr [rsp + 28], 789
  add rsp, 32
  ret
```

你可以看到，这次没有调用 `memset` 将数组初始化为零，而是直接修改相应的元素。
数组分配在栈上，但 Rust 中，栈的大小是有限制的，取决于操作系统的限制。比如 Linux 下默认为 8M，Windows 下默认为 2M。这太小了，很多情况下这是不够用的。我们可以利用 `Box`，将数组分配到堆上：

```rust
fn main() {
    let mut array: Box<[i32; 1024]> = Box::new([0; 1024]);

    array[0] = 123;
    array[1] = 456;
    array[1023] = 789;
}
```

但是，这并不是我们期望的那样：

```sh
example::main:
  mov eax, 4120
  call __rust_probestack
  sub rsp, rax
  xor esi, esi
  lea rax, [rsp + 24]
  mov rdi, rax
  mov eax, 4096
  mov rdx, rax
  mov qword ptr [rsp + 8], rax
  call memset@PLT
  mov rdi, qword ptr [rsp + 8]
  mov esi, 4
  call alloc::alloc::exchange_malloc
  mov rcx, rax
  lea rdx, [rsp + 24]
  mov rdi, rax
  mov rsi, rdx
  mov edx, 4096
  mov qword ptr [rsp], rcx
  call memcpy@PLT
  mov rax, qword ptr [rsp]
  mov qword ptr [rsp + 16], rax
  mov rax, qword ptr [rsp + 16]
  mov dword ptr [rax], 123
  mov rax, qword ptr [rsp + 16]
  mov dword ptr [rax + 4], 456
  mov rax, qword ptr [rsp + 16]
  mov dword ptr [rax + 4092], 789
  lea rdi, [rsp + 16]
  call qword ptr [rip + core::ptr::drop_in_place@GOTPCREL]
  add rsp, 4120
  ret
```

这段代码首先会在栈上分配好数组，再在堆上分配内存，然后将值拷贝到堆上。修改数组元素，需要先计算出数组的地址，然后根据偏移量（索引）去修改。我们能不能将数组直接分配到堆上呢？当然是可以的，请继续往下看。

## 什么是指针？

指针是一个包含内存地址的变量。在 Rust 中，指针包括裸指针（`*const T` 和 `*mut T`）、可变/不可变引用（也可以叫做借用）（`&mut T` 和 `&T`）和智能指针（`Box<T>`、`Rc<T>`、 `Arc<T>`、`Cell<T>`、`RefCell<T>` 、`UnsafeCell<T>` 等）。

## 如何获取数组的指针？

我们可以用 `&` 和 `&mut` 操作符取得数组的引用，再用 `as` 操作符将引用转换为裸指针：

```rust
fn main() {
    let mut array: [i32; 3] = [1, 2, 3];

    let ref1: &[i32; 3] = &array;

    let ptr1: *const [i32; 3] = ref1 as *const [i32; 3];

    let ref2: &mut [i32; 3] = &mut array;

    let ptr2: *mut [i32; 3] = ref2 as *mut [i32; 3];
}
```

我们可以用 `*` 去解引引用和裸指针，但是解引裸指针是 `unsafe` 的！需要放到 `unsafe {}` 块中。为什么不安全？请往下看。

```rust
fn main() {
    let mut array: [i32; 3] = [1, 2, 3];

    let ref1: &[i32; 3] = &array;

    let ptr1: *const [i32; 3] = ref1 as *const [i32; 3];

    unsafe {
        let mut array2: [i32; 3] = *ptr1;

        array2[0] = 123;
        array2[1] = 456;
        array2[2] = 789;

        if (array == array2) {

        }
    }
}
```

将上面代码编译后，你会发现结果并不是你预料中的那样。虽然我们解引了 `array` 的裸指针 `ptr1` 得到了 `array2`，但是修改 `array2` 的值并不会影响到 `array`。由于 `i32` 类型是实现了 `Copy`，`[i32; 3]` 也是实现了 `Copy`的，因此在解引的时候，会将 `array`复制一份。如果我们解引一个没有实现 `Copy`的类型：

```rust
fn main() {
    let s = String::new();

    let ptr: *const String = &s as *const String;

    unsafe {
        let s2: String = *ptr;
    }
}
```

这段代码是编译不过去的，编译器会告诉你：

```sh
error: src/main.rs:7: cannot move out of `*ptr` which is behind a raw pointer
error: src/main.rs:7: move occurs because `*ptr` has type `std::string::String`, which does not implement the `Copy` trait
```

Rust 通常情况下不需要你手动管理内存给，`String` 是一个分配在堆上的字符串类型，离开作用域后会自动释放堆内存。上面的代码，如果编译器不采取一些机制，阻止你这么做，让 `s` 和 `s2` 指向同一块内存，当 `s` 和 `s2` 离开作用域后，会让内存释放两次，这是不正确的。

不过编译器也提示你，将 `*ptr` 改为 `&*ptr` （help: consider borrowing here: `&*ptr`）：

```rust
fn main() {
    let s = String::new();

    let ptr: *const String = &s as *const String;

    unsafe {
        let s2: &String = &*ptr;
    }
}
```

我们利用 `&` 将裸指针转换为了 `&String`。这时候，`s` 和 `s2` 虽然指向了同一块内存，但是 `s2` 只是个不可变借用，并没有这块内存的所有权，只是临时借来用用，用完会还回去。

但是，问题又出来了，我们将上面的代码修改一下：

```rust
fn main() {
    let mut s = String::new();

    let ptr: *const String = &s as *const String;

    unsafe {
        let s2: &String = &*ptr;

        s.push('a');

        let len = s2.len();

        println!("{:?}", len); // 1
    }
}
```

根据你之前学习过的所有权的知识，上面代码是可能是无法编译通过的——可变引用与不可变引用不能同时存在（`s2` 是 `s`的不可变引用，但是后面却修改了 `s` 的值）。但是，上面的代码能编译通过，并且能正确打印出 `s2` 的长度为1。
我们将上面代码修改成通常的方式：

```rust
fn main() {
    let mut s = String::new();

    let s2: &String = &s;

    s.push('A');

    let len = s2.len();

    println!("{:?}", len);
}
```

这绝对是编译不过去的：

```sh
4 |     let s2: &String = &s;
  |                       -- immutable borrow occurs here
5 |
6 |     s.push('A');
  |     ^^^^^^^^^^^ mutable borrow occurs here
7 |
8 |     let len = s2.len();
  |               -- immutable borrow later used here
```

为什么在那种情况下 Rust 不能保证所有权机制呢？或者是，利用裸指针突破所有权机制，会造成什么样的后果？（虽然上面那段代码符合逻辑，在其他语言中也允许那么做）

我们一开始提到 “`usize` 可以表示每个内存地址”，”内存是一个大数组“。没错，裸指针其实就是个 `usize`！它存储的值，就是内存地址。

```rust
fn main() {
    let mut s = String::new();

    let ptr: *const String = &s as *const String;
    let index: usize = ptr as usize;

    println!("{:x}", index); // 类似于 7fff0ede3988

    let ptr2: *const String = index as *const String;

    unsafe {
        let s2: &String = &*ptr2;

        s.push('a');

        let len = s2.len();

        println!("{:?}", len); // 1
    }
}
```

我们将裸指针转换为 `usize`，可以再将 `usize` 转换为裸指针。在转换的过程中，会丢掉上下文信息，让编译器无法判定 `s2` 是 `s` 的不可变引用。这也为我们提供了一个豁口，得以让我们暂时突破所有权机制，去实现一些高效的数据结构。

裸指针是不安全的，在你不清楚自己在做什么时，请不要碰裸指针！

比如这段代码：

```rust
fn s_ptr() -> *const String {
    let s = "hello".to_string();
    let ptr: *const String = &s as *const String;
    ptr
}

fn main() {
    let ptr2: *const String = s_ptr();

    unsafe {
        let s2: &String = &*ptr2;

        let len = s2.len();

        println!("{:?}", len);
        println!("{}", s2); // segmentation fault (core dumped)
    }
}
```

Rust 会阻止你返回局部变量的引用，但是并没有阻止你返回裸指针。函数 `s_ptr` 中，你虽然返回出了 `s` 的裸指针，但是 `s_ptr` 调用结束后，会释放 `s` 的内存。`ptr2` 是一个悬垂指针（dangling pointer），当你解引 `ptr2` 得到 `s2` 时，`s2` 是一个悬垂引用（dangling references）。不过在正常的 Rust 代码中，编译器确保引用永远也不会变成悬垂状态：当你拥有一些数据的引用，编译器确保数据不会在其引用之前离开作用域 —— 前提是你不碰这些 `unsafe` 的东西。

可以通过裸指针修改数组吗？

当然可以！

我们先看这段代码：

```rust
fn main() {
    let array: [i32; 3] = [1, 2, 3];

    println!("{:?}", array); // [1, 2, 3]

    let ptr: *const i32 = &array as *const [i32; 3] as *const i32;

    unsafe {
        let a = ((ptr as usize) + 0) as *const i32;
        println!("{:?}", *a); // 1

        let b = ((ptr as usize) + 4) as *const i32;
        println!("{:?}", *b); // 2

        let c = ((ptr as usize) + 8) as *const i32;
        println!("{:?}", *c); // 3
    }
}
```

在这段代码中，我们将数组的裸指针 `*const [i32; 3]` 转换为 `as *const i32`，也就是第一个元素的地址。然后通过偏量去访问其他元素。由于 `i32` 类型占个字节，因此第2和第3个元素的偏移量分别是4和8。
我们再次修改代码：

```rust
fn main() {
    let array: [i32; 3] = [1, 2, 3];

    println!("{:?}", array); // [1, 2, 3]

    let ptr: *const i32 = &array as *const [i32; 3] as *const i32;

    unsafe {
        let a = ((ptr as usize) + 0) as *mut i32;

        let a2: &mut i32 = &mut *a;
        *a2 = 123;

        let b = ((ptr as usize) + 4) as *mut i32;

        let b2: &mut i32 = &mut *b;
        *b2 = 456;

        let c = ((ptr as usize) + 8) as *mut i32;

        let c2: &mut i32 = &mut *c;
        *c2 = 789;
    }

    println!("{:?}", array); // [123, 456, 789]
}
```

跟上面的代码不同的是，我们利用 `&mut *` 将裸指针转换为 `&mut i32`，再修改。最后打印 `array`，你可以看到数组已经被修改了。注意，`*const T 和 *mut T` 是可以利用 `as` 互相转换的，并不像 `&mut T` 能转换为 `&T`，而 `&T` 不能转换为 `&mut T`。虽然你可以利用裸指针作为媒介，将 `&T` 转换为 `&mut T`，在你不清楚你在做什么时，请不要这么做！

我们可以利用标准库[pointer](https://doc.rust-lang.org/stable/std/primitive.pointer.html)去简化上面的代码：

```rust
fn main() {
    let array: [i32; 3] = [1, 2, 3];

    println!("{:?}", array); // [1, 2, 3]

    let ptr: *mut i32 = &array as *const [i32; 3] as *mut i32;

    unsafe {
        println!("{:?}", ptr.add(0).read()); // 1

        ptr.add(1).write(456); // 第2个元素
    }

    println!("{:?}", array); // [1, 456, 3]
}
```

`add` 方法会帮你计算偏移量。然后用 `read` 和 `write` 就可以读写相应位置的值。还要说明的是，`*const T` 和 `*mut T` 是实现了 `Copy`的。

## 如何直接将数组分配到堆上？

Rust [alloc](https://doc.rust-lang.org/stable/std/alloc/index.html)提供了 `std::alloc::alloc`、`std::alloc::dealloc` 和 `std::alloc::realloc` 等函数，对应于 `C` 语言的 `calloc`、`free` 和 `realloc`。利用这几个函数，我们可以手动管理堆内存。

```rust
use std::alloc::{self, Layout};
use std::mem;

fn main() {
    unsafe {
        // 长度为32的i32数组
        let layout = Layout::from_size_align_unchecked(32 * mem::size_of::<i32>(), mem::size_of::<i32>());

        // 分配内存
        let ptr: *mut i32 = alloc::alloc(layout) as *mut i32;

        println!("{:?}", ptr.read());

        ptr.write(123);

        println!("{:?}", ptr.read());

        ptr.add(1).write(456);

        println!("{:?}", ptr.add(1).read());

        // 释放内存
        alloc::dealloc(ptr as *mut u8, layout);
    }
}
```

这段代码在堆上分配一个长度为32的 `i32` 数组。`alloc` 函数返回一个 `*mut u8` 指针，我们转换为 `*mut i32` 之后就可以像上一小节那样读写元素了。

更进一步，我们可以利用标准库提供的 [`slice`](https://doc.rust-lang.org/stable/std/primitive.slice.html) 类型：

```rust
use std::alloc::{self, Layout};
use std::mem;
use std::slice;

fn main() {
    unsafe {
        // 长度为32的i32数组
        let layout = Layout::from_size_align_unchecked(32 * mem::size_of::<i32>(), mem::size_of::<i32>());

        // 分配内存
        let ptr: *mut i32 = alloc::alloc(layout) as *mut i32;

        let slice: &mut [i32] = slice::from_raw_parts_mut(ptr, 32);

        slice[0] = 123;
        slice[1] = 456;
        slice[2] = 789;

        println!("{:?}", slice); // [123, 456, 789, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

        println!("{:?}", &slice[..3]); // [123, 456, 789]

        // 释放内存
        alloc::dealloc(ptr as *mut u8, layout);
    }
}
```

利用 `slice`，我们可以方便的操作数组，我们不能修改切片的长度，但是可以从旧切片得到一个新切片。`slice` 是一个胖指针，除了指针外，还包含了长度。瞧：

```rust
struct FatPtr<T> {
    data: *const T,
    len: usize
}
```

我们还可以实现动态增长的数组:

```rust
use std::alloc::{self, Layout};
use std::mem;
use std::slice;

fn main() {
    unsafe {
        // 长度为32的i32数组
        let layout = Layout::from_size_align_unchecked(32 * mem::size_of::<i32>(), mem::align_of::<i32>());

        // 分配内存
        let mut ptr: *mut i32 = alloc::alloc(layout) as *mut i32;

        // 扩容
        ptr = alloc::realloc(ptr as *mut u8, layout, 64 * mem::size_of::<i32>()) as *mut i32;

        let slice: &mut [i32] = slice::from_raw_parts_mut(ptr, 64);

        slice[0] = 123;
        slice[1] = 456;
        slice[2] = 789;

        println!("{:?}", &slice[..3]); // [123, 456, 789]

        // 释放内存
        alloc::dealloc(ptr as *mut u8, layout);
    }
}
```

原理是这样的。我们可以继续封装一下：

```rust
use std::alloc::{self, Layout};
use std::mem;
use std::slice;
use std::ops;

pub struct MyArray<T: Sized> {
    ptr: *mut T,
    capacity: usize,
    len: usize
}

impl<T: Sized> MyArray<T> {
    pub fn with_capacity(capacity: usize) -> MyArray<T> {
        let elem_size = mem::size_of::<T>();
        let alloc_size = capacity * elem_size;
        let align = mem::align_of::<T>();

        let layout = Layout::from_size_align(alloc_size, align).unwrap();

        let ptr = unsafe {
            alloc::alloc(layout) as *mut T
        };

        MyArray {
            ptr,
            capacity,
            len: 0
        }
    }

    pub fn double(&mut self) {
        let elem_size = mem::size_of::<T>();
        let new_cap = 2 * self.capacity;
        let new_size = new_cap * elem_size;

        let align = mem::align_of::<T>();
        let size = mem::size_of::<T>() * self.capacity;
        let layout = Layout::from_size_align(size, align).unwrap();

        unsafe {
            self.ptr = alloc::realloc(self.ptr as *mut u8, layout, new_size) as *mut T;
        }

        self.capacity = new_cap;
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn push(&mut self, value: T) {
        if self.len == self.capacity {
            self.double()
        }

        unsafe {
            self.ptr.add(self.len).write(value);
            self.len += 1;
        }
    }

    pub fn pop(&mut self) -> Option<T> {
        if self.len == 0 {
            None
        } else {
            self.len -= 1;
            unsafe {
                Some(self.ptr.add(self.len).read())
            }
        }
    }

    pub fn as_slice(&self) -> &[T] {
        unsafe { slice::from_raw_parts(self.ptr, self.len) }
    }

    pub fn as_mut_slice(&self) -> &mut [T] {
        unsafe { slice::from_raw_parts_mut(self.ptr, self.len) }
    }
}

impl<T: Sized> Drop for MyArray<T> {
    fn drop(&mut self) {
        let align = mem::align_of::<T>();
        let size = mem::size_of::<T>() * self.capacity;
        let layout = Layout::from_size_align(size, align).unwrap();

        for _ in 0..self.len {
            self.pop();
        }

        unsafe {
            alloc::dealloc(self.ptr as *mut u8, layout);
        }
    }
}

impl<T> ops::Deref for MyArray<T> {
    type Target = [T];

    fn deref(&self) -> &[T] {
        self.as_slice()
    }
}

impl<T> ops::DerefMut for MyArray<T> {
    fn deref_mut(&mut self) -> &mut [T] {
        self.as_mut_slice()
    }
}

fn main() {
    let mut array: MyArray<i32> = MyArray::with_capacity(3);

    array.push(1);
    array.push(2);
    array.push(3);

    println!("{:?}", array[0]); // 1

    println!("{:?}", &array[..]); // [1, 2, 3]

    array.pop();

    println!("{:?}", &array[..]); // [1, 2]

    array.push(4);
    array.push(5);

    println!("{:?}", &array[..]); // [1, 2, 4, 5]
    println!("{:?}", array.capacity()); // 6
}
```

我们只实现了几个基本的方法。在 `MyArray<T>` 结构体中包含一个指针，`capacity` 表示分配的容量，`len` 表示当前使用的长度。添加元素时，如果容量不够，对底层数组进行扩容。我们实现了 `Deref` 和 `DerefMut`，就可以方便的利用 `slice` 提供的一些方法。最后，利用 `Drop` 释放内存。

这不就是 [`Vec`](https://doc.rust-lang.org/stable/std/vec/struct.Vec.html) 嘛！

我们可以去标准库源码看 `Vec` 的实现，这是 `Vec` 的结构：

```rust
pub struct Vec<T> {
    buf: RawVec<T>,
    len: usize,
}

pub struct RawVec<T, A: Alloc = Global> {
    ptr: Unique<T>,
    cap: usize,
    a: A,
}

pub struct Unique<T: ?Sized> {
    pointer: *const T,
    _marker: PhantomData<T>,
}
```

`Unique` 是个智能指针，并不能在标准库以外的地方去使用。不过当你熟悉 Rust 的之后，你可以创建你自己的智能指针。

## 内存回收

在开始之前，你一定要清醒，“栈” 内存是系统自动分配自动回收的，“堆” 内存需要你自己申请自己并回收。我们这里所讲的 “内存回收”是指 “堆” 内存。Rust 的变量默认会放到 “栈” 上，除非你主动去干涉。

在上一节，我们实现了一个叫做 `MyArray<T>` 的动态增长数组，还给 `MyArray<T>` 实现了一个叫做 `Drop` 的 `trait`。我们给一个类型实现 `Drop` 后，当值离开作用域时，就会自动地调用 `drop` 方法。我们也可以将 `drop` 叫做析构函数。标准库 给出了一个例子：

```rust
struct HasDrop;

impl Drop for HasDrop {
    fn drop(&mut self) {
        println!("Dropping!");
    }
}

fn main() {
    let _x = HasDrop;
}
```

当 `main` 函数执行结束后，`_x` 离开了作用域，就会调用 `drop` 方法打印出 Dropping!。为了更加直观，我们可以修改一下上面的代码，将 `main` 修改成：

```rust
fn main() {
    println!("before drop");
    {
        let _x = HasDrop;
    } // 调用 HasDrop 的 drop
    println!("after drop");
}
```

这时候运行程序，会打印出：

```sh
before drop
Dropping!
after drop
```

我们再次修改：

```rust
fn main() {
    println!("before drop");

    let x = HasDrop;

    {
        let _y = x;
    } // 调用 HasDrop 的 drop

    println!("after drop");
}
```

运行这段代码同样会打印出：

```sh
before drop
Dropping!
after drop
```

我们可以继续修改：

```rust
fn main() {
    println!("before drop");

    let x = HasDrop;

    {
        let _y = &x;
    }

    println!("after drop");
} // 调用 HasDrop 的 drop
```

这时候打印的结果就跟上面不一样了：

```sh
before drop
after drop
Dropping!
```

我们分析一下以上的情况。一开始，变量 `x` 拥有 `HasDrop` 的值的所有权，当我们 `let _y = x;` 的时候，会将 `HasDrop` 的值的所有权，从 `x` 转移（`move`）到 `_y`，`_y` 离开作用域时，就会调用 `HasDrop` 的 `drop` 方法； 当我们 `let _y = &x;` 的时候，`_y` 只是得到了 `HasDrop` 的值的引用（或者叫做借用），并不拥有 `HasDrop` 的值的所有权。因此 `_y` 离开作用域时，并不会调用 `HasDrop` 的 `drop` 方法。

所有权发生转移后，原来的变量不能被再次使用。或者说已经 `drop` 后的变量不能使用。我们修改代码：

```rust
fn main() {
    println!("before drop");

    let x = HasDrop;

    {
        let _y = x;
    } // 调用 HasDrop 的 drop

    println!("after drop");

    let _z = x;
}
```

这段代码是无法编译的，编译器会告诉你：

```sh
error[E0382]: use of moved value: `x`
  --> src/main.rs:20:14
   |
12 |     let x = HasDrop;
   |         - move occurs because `x` has type `HasDrop`, which does not implement the `Copy` trait
...
15 |         let _y = x;
   |                  - value moved here
...
20 |     let _z = x;
   |              ^ value used here after move
```

我们从编译器给出的信息里可以看到 `HasDrop` 没有实现一个叫做 `Copy` 的 `trait`。那我们接下来给 `HasDrop` 实现一下 `Copy`：

```rust
#[derive(Clone, Copy)]
struct HasDrop;
```

实现 Copy 的前提是实现 Clone。不过，这段代码是无法编译的：

```sh
error[E0184]: the trait `Copy` may not be implemented for this type; the type has a destructor
 --> src/main.rs:1:17
  |
1 | #[derive(Clone, Copy)]
  |                 ^^^^ Copy not allowed on types with destructors
```

编译器告诉我们无法为 `HasDrop` 实现 `Copy`，原因是 `HasDrop` 有一个析构函数。
不过，我们可一先将 `HasDrop` 的析构函数去掉：

```rust
#[derive(Copy)]
struct HasDrop;

impl Clone for HasDrop {
    fn clone(&self) -> Self {
        println!("{:?}", "clone");

        HasDrop
    }
}

fn main() {
    let x = HasDrop;

    {
        let _y = x;
    }

    let _z = x;
}
```

这段代码能够编译运行。由于 `HasDrop` 实现了 `Copy`，在 `let _y = x;` 的时候，会将 `HasDrop` 的值拷贝一份，原先 `HasDrop` 的值的所有权并没有从 `x` 转移（`move`）到 `_y`，所以后面还可继续使用 x；

虽然实现 `Copy` 的前提是实现 `Clone`，但是 `Copy` 并不是去调用 `Clone`。如果允许拥有析构函数的类型实现 `Copy`，某些情况下会出现意料之外的结果。比如我们在上一节实现的 `MyArray<T>`：

```rust
pub struct MyArray<T: Sized> {
    ptr: *mut T,
    capacity: usize,
    len: usize
}
```

`Copy`只是简单复制（浅拷贝），只会复制`MyArray<T>`这个结构体本身，并不会复制`ptr`指向的数据，导致`ptr`指向的数据的“所有权”被双重持有。当 `MyArray<T>` 被销毁（`Drop`）时，会重复释放`buf`所指向的数据。如果要安全的复制`MyArray<T>`，可以实现`Clone`,连同`ptr`指向的数据也一并复制。

实现`Copy`的前提是：一个类型的所有组件都实现了`Copy`，并且该类型没有实现`Drop`。如果一个类型实现了`Drop`,那就表明除了它自身以外，还要管理一些资源。

不过，我们可以模拟一下 `Copy`：

```rust
fn main() {
    let mut array: MyArray<i32> = MyArray::with_capacity(3);

    array.push(1);
    array.push(2);
    array.push(3);

    println!("{:?}", &array[..]); // [1, 2, 3]

    let ptr: *mut MyArray<i32> = &mut array as *mut MyArray<i32>;

    let mut array2: MyArray<i32> = unsafe { std::mem::MaybeUninit::zeroed().assume_init() };

    let ptr2: *mut MyArray<i32> = &mut array2 as *mut MyArray<i32>;

    unsafe {
        std::ptr::copy(ptr, ptr2, 1);
    }

    assert!(array.ptr == array2.ptr);

    println!("{:?}", &array[..]); // [1, 2, 3]
    println!("{:?}", &array2[..]); // [1, 2, 3]

    array[1] = 123;

    println!("{:?}", &array[..]); // [1, 123, 3]
    println!("{:?}", &array2[..]); // [1, 123, 3]

    drop(array2);

    println!("{:?}", &array[..]); // [0, 0, 3]
}
```

上面代码中，我们分别创建了 `array 和 array2`，并转换为裸指针 `ptr` 和 `ptr2`。`ptr` 和 `ptr2` 保存着 `array` 和 `array2` 的内存地址。然后用 `std::ptr::copy` 将 `ptr` 拷贝到 `ptr2`。`std::ptr::copy` 是浅拷贝，只会拷贝指针的值，并不会拷贝指针指向的数据。`array.ptr == array2.ptr`，也就是 `array` 和 `array2` 的 `ptr` 指向了同一块内存区域。我们修改 `array` 的第二个元素，`array2` 的值也会同步变化。

这个特性有时候对我们来说的很有用的，比如多线程编程时，在多个线程之间共享状态。但是，我们调用 `array2` 的析构函数之后，这时候 `array.ptr` 已经是一个悬垂指针。当你继续修改或者析构 `array` 时，会发生一些不可预料的随机的状况，这是内存不安全的。`Rust` 提供了智能指针 `Arc<T>`，在满足这个特性的前提下保证内存安全。

`std::mem::forget` 可以让编译器“忘记” `array` 在离开作用域时调用析构函数：

```rust
std::mem::forget(array);
```

`std::mem::forget` 是危险的，使用不当会导致内存泄漏！

我们将视线转移到上一节中实现的 `MyArray<T>` 的析构函数中：

```rust
impl<T: Sized> Drop for MyArray<T> {
    fn drop(&mut self) {
        let align = mem::align_of::<T>();
        let size = mem::size_of::<T>() * self.capacity;
        let layout = Layout::from_size_align(size, align).unwrap();

        for _ in 0..self.len {
            self.pop();
        }

        unsafe {
            std::alloc::dealloc(self.ptr as *mut u8, layout);
        }
    }
}
```

在调用 `std::alloc::dealloc` 回收内存前，先将所有元素 `pop()` 出去。为什么需要这样做呢？

```rust
struct HasDrop {
    a: i32
}

impl Drop for HasDrop {
    fn drop(&mut self) {
        println!("Dropping! {}", self.a);
    }
}

fn main() {
    let mut array: MyArray<HasDrop> = MyArray::with_capacity(3);
    array.push(HasDrop { a: 123 });
    array.push(HasDrop { a: 456 });
    array.push(HasDrop { a: 789 });
}
```

在这段代码中，我们为 `HasDrop` 实现了一个析构函数，我们希望，`array` 在离开作用域时, 会调用内部存储的 `HasDrop` 的析构函数。

```sh
Dropping!
Dropping!
Dropping!
```

这没问题！但是如果你将 `self.pop();` 注释掉后，什么也不会打印。`pop()` 函数内部调用了 `std::ptr::read`，该函数会读取 `*const HasDrop` 的值，并转换为 `HasDrop`，该 `HasDrop` 离开作用域后会调用析构函数。不过，我们还可以将 `pop()` 改为：

```rust
// for _ in 0..self.len {
//     self.pop();
// }
unsafe {
    std::ptr::drop_in_place(&mut self[..]);
}
```

编译器会优化这个函数，达到同样的或者更好的效果。
我们再添加一行代码：

```rust
fn main() {
    let mut array: MyArray<HasDrop> = MyArray::with_capacity(3);
    array.push(HasDrop { a: 123 });
    array.push(HasDrop { a: 456 });
    array.push(HasDrop { a: 789 });

    unsafe { array.ptr.read(); }
}
```

这次执行后会打印：

```sh
Dropping! 123
Dropping! 789
Dropping! 456
Dropping! 123
```

这并不是我们期望的结果。因此使用 `std::ptr::read` 时要及其小心。我们可以看标准库对 `std::ptr::read` 的实现，（我们先忽略 `read` 与 `read_unaligned` 和 `write` 与 `write_unaligned` 的差异）。

```rust
pub unsafe fn read<T>(src: *const T) -> T {
    let mut tmp = MaybeUninit::<T>::uninit();
    copy_nonoverlapping(src, tmp.as_mut_ptr(), 1);
    tmp.assume_init()
}

pub unsafe fn read_unaligned<T>(src: *const T) -> T {
    let mut tmp = MaybeUninit::<T>::uninit();
    copy_nonoverlapping(src as *const u8, tmp.as_mut_ptr() as *mut u8, mem::size_of::<T>());
    tmp.assume_init()
}
```

顺带的，我们再看看 `str::ptr::write` 的实现：

```rust
pub unsafe fn write<T>(dst: *mut T, src: T) {
    intrinsics::write_via_move(dst, src)
}

pub unsafe fn write_unaligned<T>(dst: *mut T, src: T) {
    copy_nonoverlapping(&src as *const T as *const u8, dst as *mut u8, mem::size_of::<T>());
    mem::forget(src);
}
```

在 `read` 和 `write` 中，是用 `std::ptr::copy` 将 `src` 的值拷贝到 `dst` 或者将 `dst` 的值拷贝到 `src`。为什么 `write` 中会执行一下 `mem::forget(src);` ？

我们看下面的代码：

```rust
pub unsafe fn write<T>(dst: *mut T, src: T) {
    std::ptr::copy(&src as *const T as *const u8, dst as *mut u8, std::mem::size_of::<T>());
    // std::mem::forget(src);
}

fn main() {
    let mut array: [HasDrop; 1] = [unsafe { std::mem::MaybeUninit::zeroed().assume_init() }];

    unsafe {
        let d = HasDrop { a: 456 };
        write(&mut array as *mut [HasDrop; 1] as *mut HasDrop, d);
    }
}
```

我们将 `std::mem::forget(src)` 注释掉，运行这段代码：

```sh
Dropping! 456
Dropping! 456
```

调用了两次析构函数，这不是我们期望的结果。在 `write` 中，我们将 `src` 转换为了 `*const u8`，同时将 `dst` 转换为 `*mut u8`，再从 `src` 拷贝相应的字节数到 `dst`。`src` 离开作用域后，会调用析构函数，这里要用 `std::mem::forget` 阻止调用析构函数。

对于 `Drop`，标准库还提到了两个问题。其一是，`Drop` 是递归的，标准库给出了一段代码：

```rust
struct Inner;
struct Outer(Inner);

impl Drop for Inner {
    fn drop(&mut self) {
        println!("Dropping Inner!");
    }
}

impl Drop for Outer {
    fn drop(&mut self) {
        println!("Dropping Outer!");
    }
}

fn main() {
    let _x = Outer(Inner);
}
```
当 `Outer` 离开作用域时，`Outer` 的 `drop` 会先调用，然后才会调用 `Inner` 的 `drop`。并且，即使 `Outer` 没有实现 `Drop`，`Inner` 的 `drop` 也会调用：

```rust
struct Inner;
struct Outer(Inner);

impl Drop for Inner {
    fn drop(&mut self) {
        println!("Dropping Inner!");
    }
}

fn main() {
    let _x = Outer(Inner);
}
```

其二是，变量以声明的相反顺序 `drop`：

```rust
struct PrintOnDrop(&'static str);

impl Drop for PrintOnDrop {
    fn drop(&mut self) {
        println!("{}", self.0);
    }
}

fn main() {
    let _first = PrintOnDrop("Declared first!");
    let _second = PrintOnDrop("Declared second!");
}
```

你也可以去尝试结构体的字段的 `drop` 顺序，我们最好不要依赖结构体字段的析构顺序。

## 小结

到目前为止，你已经对数组和指针有了一定的了解，也体会到了“理论上，内存（我们暂且不去讨论物理内存与虚拟内存）相当于一个类型为 `u8`、长度为 `usize` 的数组，内存操作相当于操作这个数组”，“指针是一个包含内存地址的变量”。

变量的值，在内存里是以字节的形式存在的，既然如此，我们可以在一定限度内，对不同的类型进行转换，这是危险的！！！，请你一定明白自己在做什么。我们看下面的代码：

```rust
fn main() {
    let a: i32 = 123456789;

    let b: [u8; std::mem::size_of::<i32>()] = unsafe {
        *(&a as *const i32 as *const [u8; std::mem::size_of::<i32>()])
    };

    println!("{:?}", b); // [21, 205, 91, 7]
}
```

我们将一个 `i32` 类型的数字转换成了一个类型为 `u8`，长度为4的数组。`[21, 205, 91, 7]` 是 `123456789` 这个数字在内存里存在的形式。

我们还可以使用 `std::mem::transmute`：

```rust
let b: [u8; std::mem::size_of::<i32>()] = unsafe {
    // *(&a as *const i32 as *const [u8; std::mem::size_of::<i32>()])
    std::mem::transmute(a)
};
```

使用 `transmute` 的前提是，两种类型的静态大小（`std::mem::size_of`）是相等的。比如

```rust
fn main() {
    let mut array: MyArray<i32> = MyArray::with_capacity(3);

    array.push(1);
    array.push(2);
    array.push(3);

    let vec: Vec<i32> = unsafe {
        std::mem::transmute(array)
    };

    println!("{:?}", vec); // [1, 2, 3]
}
```

我们上一节实现的 `MyArray<T> 跟 Vec<T>` 内存布局是一致的，静态大小也相等。因此就可以用 `transmute` 互相转换。
`transmute` 是非常有用的，标准库 还给了一些例子，比如：

```rust
fn foo() -> i32 {
    0
}
let pointer = foo as *const ();
let function = unsafe {
    std::mem::transmute::<*const (), fn() -> i32>(pointer)
};
assert_eq!(function(), 0);
```

这个例子是将函数转换为函数指针，再将函数指针转换为函数。函数本身就是指针，比如下面段代码，你可以利用这一点，做一些有趣的事：

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn sub(a: i32, b: i32) -> i32 {
    a - b
}

fn print(s: &str) {
    println!("{}", s);
}

fn main() {
    use std::collections::HashMap;
    use std::mem::transmute;

    let mut math: HashMap<String, *const ()> = HashMap::new();

    math.insert("+".to_string(), add as *const ());
    math.insert("-".to_string(), sub as *const ());
    math.insert("p".to_string(), print as *const ());

    let add = unsafe {
        transmute::<*const (), fn(i32, i32) -> i32>(*math.get("+").unwrap())
    };
    println!("1 + 2 = {:?}", add(1, 2));

    let print = unsafe {
        transmute::<*const (), fn(s: &str)>(*math.get("p").unwrap())
    };
    print("hello");
}
```

不用 `transmute`，也可以转换函数指针：

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    let ptr = add as *const ();

    unsafe {
        let add: fn(i32, i32) -> i32 = *(&ptr as *const *const () as *const fn(i32, i32) -> i32);

        println!("1 + 2 = {:?}", add(1, 2));
    }
}
```

这段代码可能是比较费解的。我们看看主要的汇编代码：

```sh
example::main:
  push rax
  lea rax, [rip + example::add] // 计算 add 函数的地址放到 rax 寄存器
  mov qword ptr [rsp], rax
  mov edi, 1                    // 第一个参数
  mov esi, 2                    // 第二个参数
  call qword ptr [rsp]          // 调用函数
  pop rax
  ret
```

`lea rax, [rip + example::add]` 是计算函数的地址并放到 `rax` 寄存器，接着又将 `rax` 寄存器的值放进了 `[rsp]` 这块内存。此时，`ptr` 变量保存着计算出来的函数地址，而它的指针就指向 `[rsp]` 这块内存。`*(&ptr as *const *const () as *const fn(i32, i32) -> i32)` 所以这段代码的意思就是，取得 `[rsp]` 这块内存的指针，再将其解引就得到了函数本身。

## unsafe 并不可怕

很多语言都有 `unsafe` 关键字，而 Rust 使用 `unsafe` 的原因与其他语言不同。Rust 为了确保内存安全，在所有权和生存期的前提下，只要编译器无法分析出代码的正确性，就会拒绝编译通过。使用 `unsafe` 能一定程度上绕开所有权和生存期的限制。

使用 `unsafe` 时，我们需要自己对代码的正确性负责，但是编译器仍然会尽可能帮我们检查。

例如，我们可以安全的得到一个类型的裸指针：

```rust
fn main() {
    let s = "main.run".to_string();
    let s_ptr: *const String = &s as *const String;
    // 或
    let s_ptr: *const String = &s; // 引用可以强制转换为裸指针
}
```

但是，解引裸指针需要在 `unsafe` 中进行：

```rust
let s2: &String = unsafe { &*s_ptr };
```

之所以这里是 `&*s_ptr` 而不是 `*s_ptr`,是因为 Rust 的所有权系统在这里仍然起作用：

```rust
error[E0507]: cannot move out of `*s_ptr` which is behind a raw pointer
 --> src/main.rs:5:31
  |
5 |     let s2: String = unsafe { *s_ptr };
  |                               ^^^^^^
  |                               |
  |                               move occurs because `*s_ptr` has type `String`, which does not implement the `Copy` trait
  |                               help: consider borrowing here: `&*s_ptr`
```

Rust 拒绝从裸指针移出所有权，除非类型实现了`Copy`，将“移动语义”变为“复制语义”。

实现`Copy`的前提是：一个类型的所有组件都实现了`Copy`，并且该类型没有实现`Drop`。如果一个类型实现了`Drop`,那就表明除了它自身以外，还要管理一些资源。`String` 可以简化成以下结构：

```rust
struct String {
    buf: *mut u8,
    len: usize,
    cap: usize
}

impl Drop for String {
    fn drop(&mut self) {
        unsafe {
            std::ptr::drop_in_place(std::ptr::slice_from_raw_parts_mut(self.buf, self.len))
        }
    }
}
```

`Copy`只是简单复制（浅拷贝），只会复制`String`这个结构体本身，并不会复制`buf`指向的数据，导致`buf`所指向的数据的“所有权”被双重持有。当 `String` 被销毁（Drop）时，会重复释放`buf`所指向的数据。如果要安全的复制`String`，可以实现`Clone`,连同`buf`指向的数据也一并复制。

也就是说，在 `unsafe` 中，Rust 也不允许我们突破这个限制。

但是解引裸指针也会变得非常危险，例如以下代码：

```rust
fn main() {
    let s_ptr: *const String = 123 as *const String;

    let s2: &String = unsafe { &*s_ptr };

    println!("{:?}", s2);
}
```

我们可以将 `123` 安全的转换为 `*const String`，然后在 `unsafe` 解引 `*const String`，编译器无法为我们检查裸指针的有效性。这段代码能够通过编译，但是会触发运行时错误：

```rust
$ cargo run
   Compiling rust-study-note v0.1.0 (rust-study-note)
    Finished dev [unoptimized + debuginfo] target(s) in 0.17s
     Running `target/debug/rust-study-note`
[1]    11810 segmentation fault (core dumped)  cargo run
```

即使这样，我们也可以乐观的说：在 Rust 中使用 `unsafe` 仍然能够为我们降低心智负担，一旦出问题我们也能快速缩小范围，定位问题。

回归正题。

在上面的代码，我们可以看到，`123 as *const String` 将 `i32` 转换为了 `*const String`。我们可以借助裸指针转换类型：

```rust
fn main() {
    let s = "main.run".to_string();

    let s_ptr: *const String = &s;
    let vec_ptr: *const Vec<u8> = s_ptr as *const Vec<u8>;
    let vec: &Vec<u8> = unsafe { &*vec_ptr };

    println!("{:?}", vec);
}
```

由于 `String` 与 `Vec<u8>` 具有相同的结构，程序并没有崩溃。但是如果反过来：

```rust
fn main() {
    let vec = vec![0u8, 1, 2, 3, 4, 5];

    let vec_ptr: *const Vec<u8> = &vec;
    let s_ptr: *const String = vec_ptr as *const String;
    let s: &String = unsafe { &*s_ptr };

    println!("{:?}", s);
}
```

由于 `String` 是 UTF-8 编码的字符串，在这里我们没有保证 `Vec<u8>` 是 UTF-8 编码，虽然这段代码可以编译通过，但会产生错误的运行结果：

```rust
$ cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.16s
     Running `target/debug/rust-study-note`
"\u{0}\u{1}\u{2}\u{3}\u{4}\u{5}"
```

甚至，利用裸指针可以转换可变性：

```rust
fn main() {
    let vec = vec![0u8, 1, 2, 3, 4, 5];
    let vec_ptr: *const Vec<u8> = &vec;
    let vec_mut_ptr: *mut Vec<u8> = vec_ptr as *mut Vec<u8>;

    let vec_mut: &mut Vec<u8> = unsafe { &mut *vec_mut_ptr };
    vec_mut[1] = 123;

    println!("{:?}", vec_mut);
}
```

这段代码中，`vec` 虽然是不可变的，借助裸指针，我们仍然可以修改它。但是这会破环 Rust 的借用机制，例如以下代码：

```rust
fn main() {
    let vec = vec![0u8, 1, 2, 3, 4, 5];
    let vec_ptr: *const Vec<u8> = &vec;
    let vec_mut_ptr: *mut Vec<u8> = vec_ptr as *mut Vec<u8>;

    let vec_mut: &mut Vec<u8> = unsafe { &mut *vec_mut_ptr };
    vec_mut[1] = 123;

    let vec_mut2: &mut Vec<u8> = unsafe { &mut *vec_mut_ptr };
    vec_mut2[2] = 234;

    println!("{:?}", vec_mut);
    println!("{:?}", vec_mut2);
}
```

在同一个作用域中存在两个或以上可变引用，这违背了 Rust 的初心。迫不得已的情况下，请不要这么做！

不过也不要谈之色变，标准库提供的智能指针，`Cell`、`RefCell`、`Rc`、`Arc` 等，也是利用这些特性，并考虑了边边角角的问题，为我们提供了安全的API。

裸指针也大量用于与外部函数的交互上，例如标准库文档中提到的一个例子：

```rust
extern crate libc;

use std::mem;

unsafe {
    let my_num: *mut i32 = libc::malloc(mem::size_of::<i32>()) as *mut i32;
    if my_num.is_null() {
        panic!("failed to allocate memory");
    }
    libc::free(my_num as *mut libc::c_void);
}
```

C 函数经常会接收或返回裸指针。上面代码中，`libc::malloc` 会返回 `*mut libc::c_void`, 我们需要转换至目标类型。

这里再提供一个例子。在编写 Mosquitto （一个 Mqtt broker）身份认证插件时，我需要用 Rust 编写一个动态库，给 Mosquitto 调用。在 `mosquitto_plugin.h` 文件中，对于 `struct mosquitto;` 的定义非常含糊：

```c
struct mosquitto;
```

并没有给出内部定义。在 Rust 这边，我需要提供一个函数 `mosquitto_auth_acl_check` 给 C 调用：

```c
int mosquitto_auth_acl_check(void *user_data, int access, const struct mosquitto *client, const struct mosquitto_acl_msg *msg);
```

`struct mosquitto` 里保存着客户端的 ID、用户名、密码等信息，需要取出来验证。进一步查看 Mosquitto源码,发现 `struct mosquitto` 的定义非常复杂，在 Rust 这边难以定义出一个“差不多”的：

```c
struct mosquitto {
#if defined(WITH_BROKER) && defined(WITH_EPOLL)
	/* This *must* be the first element in the struct. */
	int ident;
#endif
	mosq_sock_t sock;
#ifndef WITH_BROKER
	mosq_sock_t sockpairR, sockpairW;
#endif
	uint32_t maximum_packet_size;
#if defined(__GLIBC__) && defined(WITH_ADNS)
	struct gaicb *adns; /* For getaddrinfo_a */
#endif
	enum mosquitto__protocol protocol;
	char *address;
	char *id;
	char *username;
	char *password;
	uint16_t keepalive;
	uint16_t last_mid;
	enum mosquitto_client_state state;
	time_t last_msg_in;
	time_t next_msg_out;
	time_t ping_t;
	struct mosquitto__packet in_packet;
	struct mosquitto__packet *current_out_packet;
	struct mosquitto__packet *out_packet;
	struct mosquitto_message_all *will;
	struct mosquitto__alias *aliases;
	struct will_delay_list *will_delay_entry;
	int alias_count;
    // 此处省略
```

但是这也难不到我。我可以在 Rust 这边也定义一个“含糊”的：

```rust
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct mosquitto {
    _pad0: i32,
    _pad1: i32,
    _pad2: i32,
    address: *const c_char,
    id: *const c_char,
    username: *const c_char,
    password: *const c_char,
    _unused: [u8; 0]
}

#[no_mangle]
pub extern fn mosquitto_auth_acl_check(
    user_data: *mut c_void,
    access: i32,
    client: *const mosquitto,
    msg: *const mosquitto_acl_msg
) -> i32 {
    let client: &mosquitto = unsafe { &*client };

    let address = unsafe { CStr::from_ptr(client.address) };
    let id = unsafe { CStr::from_ptr(client.id) };
    let username = unsafe { CStr::from_ptr(client.username) };
    let password = unsafe { CStr::from_ptr(client.password) };

    return 0
}
```

不管是直接解引裸指针还是使用 `transmute`，很多情况下是非常不安全的。例如：

```rust
struct TypeA {
    a: usize,
    b: usize,
    c: usize
}
fn main() {
    let a = TypeA { a: 123, b: 456, c: 789 };

    let vec_ptr = &a as *const TypeA as *const Vec<u8>;
    let vec: &Vec<u8> = unsafe { &*vec_ptr };
    println!("{:?}", vec);
    // 或
    let vec: Vec<u8> = unsafe { std::mem::transmute(a) };
    println!("{:?}", vec);
}
```

`TypeA` 和 `Vec<u8>` 虽然具有相同的大小， 但是这么转换显然是不正确的。虽然我们换种方式：

```rust
#[derive(Debug)]
struct TypeA {
    ptr: *const u8,
    cap: usize,
    len: usize
}
fn main() {
    let vec = vec![0u8, 1, 2, 3, 4, 5];
    let a: TypeA = unsafe { std::mem::transmute(vec) };

    println!("{:?}", a);
}
```

这段代码虽然能够输出：

```rust
cargo run
   Compiling rust-study-note v0.1.0 (rust-study-note)

warning: `rust-study-note` (bin "rust-study-note") generated 3 warnings
    Finished dev [unoptimized + debuginfo] target(s) in 0.17s
     Running `target/debug/rust-study-note`
TypeA { ptr: 0x5613ade72ba0, cap: 6, len: 6 }
```

但是，`Vec<T>` 通过实现 `Drop` 管理指针指向的数据，`TypeA`没有实现，这会造成内存泄漏。

并且，对于 `repr(C)` 类型和 `repr(transparent)` 类型，布局可以精确定义，但是对于普通 Rust 代码（`repr(Rust)`），即使是 `Vec<i32>` 和 `Vec<u32>` 也不能确保字段顺序一定相同， Rust 没有给过这个保证。我们会看到一些与外部交互的类型加了 `#[repr(C)]`， 这正是为了保证布局稳定。

例如下面的代码：

```rust
#[repr(C)]
struct TypeA {
    a: i32,
    b: u32
}

#[repr(C)]
struct TypeB {
    a: i32,
    b: u32
}

fn main() {
    let a = TypeA { a: 123, b: 456 };
    let b: TypeB = unsafe { std::mem::transmute(a) };
}
```

我们给 `TypeA` 和 `TypeB` 添加了 `#[repr(C)]`，保证字段顺序一致。

`transmute_copy` 与 `transmute` 相似，但是不需要两种类型大小一致。

## 最后

本文提到的部分操作是不安全的，但希望读者可以通过阅读本文加深对 Rust 的理解，如果你没有足够了解 Rust，也没有高超的技艺，请不要将本文提到的那些不安全的方法用于实际的生产环境！
