# 基本语法

## 变量绑定

- 使用 `let` 关键字声明变量，默认不可变
- 使用 `mut` 关键字声明可变变量
- 使用 `const` 声明常量

```rust
let x = 1; // 不可变变量
let mut y = 2; // 可变变量
const z: i32 = 3; // 常量
```

## 函数声明

使用 `fn` 关键字声明函数，函数体放在 `{}` 中。

```rust
fn main() {
  println!("Hello, world!");
}
```

## 语句和表达式

- 语句：执行某种操作但不返回值的指令
- 表达式：计算并返回值的指令

```rust
let y = {
    let x = 3;
    x + 1 // 这个没有分号的行是一个表达式
};
```

## 控制流

`if`、`else`、`else if`：

```rust
if condition {
    // 执行某些操作
} else if another_condition {
    // 执行其他操作
} else {
    // 执行其他操作
}
```

`loop`、`while`、`for`：

```rust
let mut x = 1;
loop {
    x += 1;
    if x == 10 {
        break;
    }
}

while x != 0 {
    x -= 1;
}

for number in (1..4).rev() {
    println!("{}!", number);
}
```

## 所有权

Rust 的所有权系统是一种用于管理内存和资源的技术，它确保了内存安全性和防止未定义行为。所有权的核心概念包括：

- 所有权：每个值都有一个所有者，所有者负责管理值的生命周期。
- 借用：通过引用传递值，而不转移所有权。
- 生命周期：值在内存中的存在时间。

## 所有权规则

- 每个值都有一个所有者。
- 每个值同时只能有一个所有者。
- 当所有者超出范围时，值将被销毁。

## 借用

Rust 使用引用（&）来借用值，而不转移所有权。

```rust
let s1 = String::from("hello");
let s2 = &s1;
```

## 生命周期

Rust 使用生命周期来管理借用值的范围。

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

## 模式匹配

模式匹配用于根据值的结构进行匹配。

```rust
match value {
    pattern1 => expression1,
    pattern2 => expression2,
    _ => expression3
}
```

## 错误处理

Rust 使用 `Result` 枚举类型来处理错误。

```rust
enum Result<T, E> {
    Ok(T),
    Err(E)
}

fn divide(numerator: i32, denominator: i32) -> Result<i32, String> {
    if denominator == 0 {
        Err("Cannot divide by zero".to_string())
    } else {
        Ok(numerator / denominator)
    }
}
```

## 闭包

闭包是匿名函数，可以捕获并存储其环境中的变量。

```rust
let add = |x: i32, y: i32| x + y;
```

## 模块

Rust 使用模块来组织代码，模块可以包含函数、结构体、枚举等。

```rust
mod math {
    pub fn add(x: i32, y: i32) -> i32 {
        x + y
    }
}
```

## 特征

特征是定义方法的集合，可以被类型实现。

```rust
trait Draw {
    fn draw(&self);
}

struct Circle {
    radius: f64
}

impl Draw for Circle {
    fn draw(&self) {
        println!("Drawing a circle with radius {}", self.radius);
    }
}
```
