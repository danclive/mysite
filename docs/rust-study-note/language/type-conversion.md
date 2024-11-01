# 类型转换

## Rust 都有哪些类型转换方式？

- `as` 关键字
- `From` 和 `Into` trait
- `TryFrom` 和 `TryInto` trait
- `Deref` 和 `DerefMut` trait
- `AsRef` 和 `AsMut` trait
- `std::mem::transmute` 函数
- `ToString` 和 `FromStr` trait

## 哪些情况可以使用 `as` 关键字转换类型？

### 数值类型之间的转换：
   - 整数之间的转换：`i32 as i64`, `u32 as i8` 等
   - 浮点数之间的转换：`f32 as f64`
   - 整数和浮点数之间的转换：`f64 as i32`, `i32 as f64`

示例代码：

```rust
fn main() {
    let a: i32 = 1234567890;
    println!("a = {a}");

    // 整数之间的转换
    let b: i64 = a as i64;
    println!("b = {b}");

    let c: i16 = a as i16; // 溢出
    println!("c = {c}");

    // 整数转换为浮点数
    let d: f64 = a as f64;
    println!("d = {d}");

    // 浮点数转换为整数
    let e: i32 = 123.456_f32 as i32; // 截断为 123
    println!("e = {e}");

    // 浮点数之间的转换
    let f: f32 = 123.4567890123_f64 as f32; // 精度丢失
    println!("f = {f}");
}
```

要特别小心，高范围整数转换为低范围整数时，可能会发生溢出。如果想让这种情况更加可控，
避免溢出带来的风险，可以使用 `TryFrom` 和 `TryInto` trait。

示例代码：

```rust
fn main() {
    let a: i32 = 1234567890;

    let ret = i16::try_from(a);
    println!("{:?}", ret); // Err(TryFromIntError(()))

    let a: i32 = 12345;

    let ret = i16::try_from(a);
    println!("{:?}", ret); // Ok(12345)
}
```

### 指针类型转换：
   - 借用转换为指针：`&T as *const T`
   - 指针之间的转换：`*const T as *mut T`
   - 指针转换为 `usize`：`ptr as usize`
   - `usize` 转换为指针：`addr as *const T`

示例代码：

```rust
fn main() {
    let mut a: i32 = 1234567890;
    let a_ref: &i32 = &a;

    // 借用转换为指针
    let ptr: *const i32 = a_ref as *const i32;
    println!("{:?}", ptr);

    let a_mut_ref: &mut i32 = &mut a;

    // 可变借用转换为可变指针
    let mut_ptr: *mut i32 = a_mut_ref as *mut i32;
    println!("{:?}", mut_ptr);

    // 指针之间转换: 可变指针转换为不可变指针
    let ptr2: *const i32 = a_mut_ref as *const i32;
    println!("{:?}", ptr2);

    // 指针之间转换: 不可变指针转换为可变指针
    let mut_ptr2: *mut i32 = ptr as *mut i32;
    println!("{:?}", mut_ptr2);

    // 指针转换为usize
    let addr: usize = ptr as usize;
    println!("{:?}", addr);

    // usize转换为指针
    let ptr_back: *const i32 = addr as *const i32;
    println!("{:?}", ptr_back);
}
```

> Note： Rust 1.82 及以上版本，可以使用 `&raw const` 和 `&raw mut` 获取指针。
>
> 示例代码：
>
> ```rust
> fn main() {
>     let mut a: i32 = 1234567890;
>
>     // 使用 `&raw const` 获取指针
>     let ptr: *const i32 = &raw const a;
>     println!("{:?}", ptr);
>
>     // 使用 `&raw mut` 获取可变指针
>     let mut_ptr: *mut i32 = &raw mut a;
>     println!("{:?}", mut_ptr);
> }
> ```

### 枚举转换为整数：

示例代码：

```rust
fn main() {
    enum E {
        V1,
        V2,
    }

    let e: E = E::V1;
    let v: u32 = e as u32;
    println!("{}", v);
}
```

### 函数指针之间的转换：

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    let f: fn(i32, i32) -> i32 = add;
    let v: i32 = f(1, 2);
    println!("{}", v);
}
```
