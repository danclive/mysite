# Rust 类型系统的基石： trait

`trait` 用于描述类型可以实现的抽象接口，可以包含关联项，关联项有三种：常量、类型和函数。

```rust
trait Example {
    const CONST_NO_DEFAULT: i32; // 常量
    const CONST_WITH_DEFAULT: i32 = 99; // 带有默认值的常量
    type TypeNoDefault; // 类型
    // type TypeHasDefault = usize; // 该功能还未稳定， https://github.com/rust-lang/rust/issues/29661
    // 函数
    fn method_without_default(&self) -> Self::TypeNoDefault;
    // 默认实现的函数
    fn method_with_default(&self) {
        let _ = self.method_without_default();
    }
}

struct MyType;

impl Example for MyType {
    const CONST_NO_DEFAULT: i32 = 123; // 不带默认值的常量必须指定值
    // const CONST_WITH_DEFAULT: i32 = 199; // 带有默认值的常量可以忽略

    type TypeNoDefault = u32; // 类型必须指定

    // 没有默认实现的函数必须实现
    fn method_without_default(&self) -> Self::TypeNoDefault {
        println!("{}", Self::CONST_WITH_DEFAULT);

        456
    }

    // 默认实现的函数可以忽略
    // fn method_with_default(&self) {

    // }
}
```

借助这一点，`rust` 极大的提高了我们的编程。例如，要为一个类型实现[迭代器](https://doc.rust-lang.org/stable/std/iter/index.html)：

```rust
pub trait Iterator {
    type Item;

    // 必要的函数
    fn next(&mut self) -> Option<Self::Item>;

    // 提供的函数
    fn next_chunk<const N: usize>(
        &mut self
    ) -> Result<[Self::Item; N], IntoIter<Self::Item, N>>
       where Self: Sized { ... }
    fn size_hint(&self) -> (usize, Option<usize>) { ... }
    fn count(self) -> usize
       where Self: Sized { ... }
    fn last(self) -> Option<Self::Item>
       where Self: Sized { ... }
    ...
}
```
我们只需要指定 `Item` 的类型，并实现 `next` 这一个函数，其他几十个函数已经默认帮我们实现好了。

```rust
struct Counter {
    count: usize,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: 0 }
    }
}

impl Iterator for Counter {
    // 指定类型
    type Item = usize;

    // next 是必须要实现的
    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;

        if self.count < 6 {
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    let counter = Counter::new();

    for n in counter {
        println!("n: {:?}", n);
    }
}
```

类似的，[Read](https://doc.rust-lang.org/stable/std/io/trait.Read.html), [Write](https://doc.rust-lang.org/stable/std/io/trait.Write.html) 等这类 trait 也具备这个特性。

## Impl trait

`trait` 可用于泛型的类型参数，用来约束参数必须实现了某个 `trait`：

```rust
fn with_generic_type<T: Trait>(arg: T) {
}

pub fn notify<T: Summary + Display>(item: &T) {
}
```

上面的写法也可以用 `Impl trait` 替换，两种写法几乎是等价的。`Impl trait` 放在参数中叫做`匿名类型参数`（anonymous type parameters）

```rust
fn with_impl_trait(arg: impl Trait) {
}

pub fn notify(item: &(impl Summary + Display)) {
}
```

借助 `impl` 或 `dyn`, trait 也可用在函数的返回位置：

```rust
fn returns_summarizable() -> impl Summary {
    todo!()
}

fn returns_summarizable() -> Box<dyn Summary> {
    todo!()
}
```

`Impl trait` 放在返回位置叫做`抽象返回类型`（abstract return types）

## Supertrait

`rust` 中没有继承，但是你可以将一个 `trait` 定义为另一个 `trait` 的超集，例如：

```rust
trait Person {
    fn name(&self) -> String;
}

// Person 是 Student 的 supertrait.
// 要实现 Student 也要实现 Person
trait Student: Person {
    fn university(&self) -> String;
}

trait Programmer {
    fn fav_language(&self) -> String;
}

// CompSciStudent 是 Programmer 和 Studentis 的 subtrait
// 实现 CompSciStudent 也要实现两个 supertraits
trait CompSciStudent: Programmer + Student {
    fn git_username(&self) -> String;
}

// CompSciStudent 是 Programmer + Student 的超集， Student 是 Person 的超集，
// 因此可以调用它们包含的函数
fn comp_sci_student_greeting(student: &impl CompSciStudent) -> String {
    format!(
        "My name is {} and I attend {}. My favorite language is {}. My Git username is {}",
        student.name(),
        student.university(),
        student.fav_language(),
        student.git_username()
    )
}
```

## 扩展

我们可以为任何类型实现自己的 `trait`, 以扩展其成员函数。例如：

```rust
use std::time::Duration;

trait ExtU32 {
    fn micros(self) -> Duration;
    fn secs(self) -> Duration;
}

impl ExtU32 for u32 {
    fn micros(self) -> Duration {
        Duration::from_micros(self as u64)
    }

    fn secs(self) -> Duration {
        Duration::from_secs(self as u64)
    }
}

fn main() {
    let one_secs: Duration = 1.secs();
    let one_micros: Duration = 1.micros();
}
```

## 标记

在 `rust` 中，有一些不包含关联项的 `trait` 被用作 `标记`（[marker](https://doc.rust-lang.org/stable/std/marker/index.html)），用于分类类型。例如 `Copy`，`Sized`，`Send`，`Sync` 等。

### Copy

```rust
pub trait Copy: Clone {
    // Empty.
}
```

`Copy` 用来“标记”只需要复制比特就其复制其值的类型。在 `Rust` 中，变量绑定默认具有“移动语义”，如果为类型实现了 `Copy`,类型就具有了“复制语义”。

`Rust` 中的基本类型和标准库中的很多基础类型都实现了 `Copy`，但对于自定义类型， `Copy` 不会自动实现，需要我们根据需要自己实现。为类型实现 `Copy` 有两种方法，可以使用 `derive` 宏或者手动实现：

```rust
#[derive(Copy, Clone)]
struct MyStruct;

// 或者

struct MyStruct;

impl Copy for MyStruct { }

impl Clone for MyStruct {
    fn clone(&self) -> MyStruct {
        *self
    }
}
```

类型实现 `Copy` 的前提是实现了 `Clone` ,如果无法或者没有实现 `Clone`,就无法实现 `Copy`。

还有 2 种情况也无法实现 `Copy`:

- “共享借用”或者说“不可变借用”是实现了 `Copy` 的，但“可变借用”无法实现 `Copy`;
- 实现了 [Drop](https://doc.rust-lang.org/stable/std/ops/trait.Drop.html) 的类型也无法实现 `Copy`, 例如 `Vec`, `String` 等类型，除了管理自己的 `size_of::<T>` 字节外，还管理着其他资源。

### Sized

```rust
pub trait Sized {
    // Empty.
}
```

`Sized` 用来标记编译时能确定大小的类型。所有的类型参数都默认绑定了 `Sized`,但可以使用特殊的 `?Sized` 语法删除此约束。

```rust
struct Foo<T>(T);
struct Bar<T: ?Sized>(T);

// struct FooUse(Foo<[i32]>); // error: Sized is not implemented for [i32]
struct BarUse(Bar<[i32]>); // OK
```

但是 `trait` 的隐式 `Self` 是个例外, `trait` 没有隐式的 `Sized` 约束。

```rust
trait Foo { }
trait Bar: Sized { }

struct Impl;
impl Foo for Impl { }
impl Bar for Impl { }

let x: &dyn Foo = &Impl;    // OK
// let y: &dyn Bar = &Impl; // error: the trait `Bar` cannot
                            // be made into an object
```

### Send

```rust
pub unsafe auto trait Send {
    // empty.
}
```

`Send`

### Sync

我们也可以标记自己的类型

我们也可以定义自己的 `marker`，对类型进行分类。

## 关联类型
