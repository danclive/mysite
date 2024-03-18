# 使用 trait 进行类型转换

除了使用 `as`, `&`, `*` 操作符进行基本类型之间的类型转换之外，Rust 还为我们提供了一些有用的 `trait`，帮助我们进行类型转换，这类 trait 能一定程度上提升编程体验。本文会介绍一部分。

## Asref，AsMut 和 Borrow，BorrowMut

`AsRef` 和 `Borrow` 用于进行廉价的从引用到引用的转换，并且还具有相同的签名：

```rust
pub trait AsRef<T> where
    T: ?Sized, {
    fn as_ref(&self) -> &T;
}

pub trait Borrow<Borrowed> where
    Borrowed: ?Sized, {
    fn borrow(&self) -> &Borrowed;
}
```

不同的地方在于：

1. `Borrow` 对于任何 `T` 都有全面的实现，而 `AsRef` 却没有。

```rust
impl<T: ?Sized> const Borrow<T> for T {
    fn borrow(&self) -> &T {
        self
    }
}

impl<T: ?Sized> const Borrow<T> for &T {
    fn borrow(&self) -> &T {
        &**self
    }
}

impl<T: ?Sized> const Borrow<T> for &mut T {
    fn borrow(&self) -> &T {
        &**self
    }
}
```

因此对于自定义类型能直接使用：

```rust
use std::borrow::Borrow;

struct MyType;

fn main() {
    let mut my_type = MyType;

    let _: &MyType = my_type.borrow();
    let _: &MyType = (&my_type).borrow();
    let _: &MyType = (&mut my_type).borrow();
}
```

我们也可以手动实现：

```rust
use std::borrow::Borrow;

struct MyType {
    inner: MyTypeInner
}

struct MyTypeInner;

impl Borrow<MyTypeInner> for MyType {
    fn borrow(&self) -> &MyTypeInner {
        &self.inner
    }
}

fn main() {
    let my_type = MyType { inner: MyTypeInner };

    let _: &MyType = my_type.borrow();
    let _: &MyTypeInner = my_type.borrow();
}
```

2. `Borrow` 还要求，如果借用（Borrowed）的`Eq`、`Ord`、`Hash`是相等的，那么原值也应该是相等的。也就是，如果 `x.borrow() == y.borrow()`, 那么 `x == y`。不过，Rust 并没有从语法或者库的层面约束这一行为，这更像是一个约定，我们使用的时候要留意就行。

```rust
use std::borrow::Borrow;
use std::cmp::Ordering;

#[derive(Debug, PartialEq, PartialOrd, Eq, Ord, Hash)]
struct IDNumber(String); // 身份证号

#[derive(Debug)]
struct Person {
    id: IDNumber,
    name: String
}

impl Borrow<IDNumber> for Person {
    fn borrow(&self) -> &IDNumber {
        &self.id
    }
}

fn main() {
    let person1 = Person {
        id: IDNumber("123456".to_string()),
        name: "张三三".to_string()
    };

    let person2 = Person {
        id: IDNumber("123456".to_string()),
        name: "张三".to_string()
    };

    let id1: &IDNumber = person1.borrow();
    let id2: &IDNumber = person2.borrow();
    if id1 == id2 {
        // person1 == person2
    }
}
```

例如，在这个例子中，由于身份证号是唯一的，且不允许修改，而姓名是可以修改的。虽然我没有为`Person`实现 `Eq`、`Ord` 和 `Hash`，但我只要判断身份号是否相同，就能判断是否是同一个人。

相比之下，`AsRef` 并没有上述限制，一般情况下使用 `AsRef` 会更加灵活。`AsMut` 和 `BorrowMut` 是 `AsRef` 和 `Borrow` 的可变版本。

在实际使用的时候，由于标准库已经为常见类型实现了 `AsRef`，使用起来会非常方便。我们也可以为自定义类型手动实现。

例如，标准库中有以下实现：

```rust
impl AsRef<[u8]> for str
impl AsRef<[u8]> for String
impl<T> AsRef<[T]> for [T]
impl<T, A> AsRef<[T]> for Vec<T, A> where
    A: Allocator,
```

我们定义一个函数：

```rust
fn input_u8<T: AsRef<[u8]>>(t: T) {
    println!("&[u8]: {:?}", t.as_ref())
}

fn main() {
    let str = "main.run";
    let string = "main.run".to_string();
    let vec = vec![0u8, 1, 2, 3];

    input_u8(str);
    input_u8(string);
    input_u8(vec);
}
```

这个函数可以接受 `&str`, `String`, `Vec<u8>` 等类型的输入。

## From 和 Into

`From` 和 `Into` 用于进行昂贵的类型转换，相较于 `AsRef` 和 `Borrow`，转换时会可能有一定的开销。例如 `&str` 到 `String` 或 `&String` 到 `String`，转换时会发生内存拷贝等操作。

`Into` 不需要我们手动实现，只要实现了 `Form`，就自动实现了 `Into`:

```rust
pub trait From<T> {
    fn from(T) -> Self;
}

pub trait Into<T> {
    fn into(self) -> T;
}

impl<T, U> const Into<U> for T
where
    U: ~const From<T>,
{
    fn into(self) -> U {
        U::from(self)
    }
}
```
在实际使用的时候，`From` 和 `Into` 通常会配合使用。标准库已经为众多类型实现了 `From`，使用起来会非常方便。我们也可以为自定义类型手动实现。

例如，标准库中有以下实现：

```rust
impl From<&'_ str> for String
impl From<&'_ String> for String
impl From<char> for String
```

我们定义一个函数：

```rust
fn input_string<T: Into<String>>(t: T) {
    println!("string: {:?}", t.into())
}

fn main() {
    let str = "main.run";
    let string = "main.run".to_string();
    let char = 'm';

    input_string(str);
    input_string(&string);
    input_string(char);
}
```

这个函数可以接受 `&str`, `&String`, `char` 等类型的输入。

我们也可以自己实现：

```rust
use std::fs::File;
use std::io::Read;

#[derive(Debug)]
struct FileCache {
    data: Vec<u8>
}

impl From<&File> for FileCache {
    fn from(mut file: &File) -> FileCache {
        let mut buf = Vec::new();

        file.read_to_end(&mut buf).unwrap();

        FileCache { data: buf }
    }
}

fn input_file_cache<T: Into<FileCache>>(t: T) {
    println!("FileCache: {:?}", t.into())
}
```

例如这段代码，我们有一个类型 `FileCache`，用于缓存文件内容，并利用 `From` 实现了 `&File` 到 `FileCache` 的转换。

但是，这段代码存在一个问题： `file.read_to_end(&mut buf).unwrap();`。读取文件时可能会失败，这里只是忽略，一旦失败就会导致程序崩溃。虽然有时候我们希望失败的时候让程序直接崩溃，但是如果是作为一个库给别人使用，这么做不一定合适。

一般情况下，`From` 和 `Into` 不应该失败。如果有可能失败，应该使用 `TryForm` 和 `TryInto`。

## `TryForm` 和 `TryInto`

`TryForm` 和 `TryInto` 与 `From` 和 `Into` 是非常相似的，不同之处仅在于 `TryForm` 和 `TryInto` 允许失败，并返回错误信息。

```rust
pub trait TryFrom<T> {
    type Error;
    fn try_from(value: T) -> Result<Self, Self::Error>;
}

pub trait TryInto<T> {
    type Error;
    fn try_into(self) -> Result<T, Self::Error>;
}

impl<T, U> TryInto<U> for T
where
    U: TryFrom<T>,
{
    type Error = U::Error;

    fn try_into(self) -> Result<U, U::Error> {
        U::try_from(self)
    }
}
```

上面的代码我们可以用 `TryForm` 和 `TryInto` 改写：

```rust
use std::fs::File;
use std::io::{self, Read};

#[derive(Debug)]
struct FileCache {
    data: Vec<u8>
}

impl TryFrom<&File> for FileCache {
    type Error = io::Error;

    fn try_from(mut file: &File) -> Result<FileCache, Self::Error> {
        let mut buf = Vec::new();

        file.read_to_end(&mut buf)?;

        Ok(FileCache { data: buf })
    }
}

fn input_file_cache1<T: TryInto<FileCache>>(t: T) {
    let ret = t.try_into();
    if let Some(file_cache) = ret.ok() {
        println!("FileCache: {:?}", file_cache);
    }
}

fn input_file_cache2<T: TryInto<FileCache, Error = io::Error>>(t: T) -> io::Result<()> {
    println!("FileCache: {:?}", t.try_into()?);

    Ok(())
}
```

`TryForm` 和 `TryInto` 允许返回失败时的错误，由调用者决定如何处理。

## `Deref` 和 `DerefMut`

`Deref` 是一个重要且特殊的 trait。`Deref` 用于不可变引用的解引用操作，相当于操作符 `*`。

我们先看一个例子：

Rust 标准库提供的 `String` 类型内部为 `Vec<u8>`，是 UTF-8 编码的可增长的字符串，UTF-8 编码不允许我们对字符串进行恒定时间的索引或切片操作。

```rust
pub struct String {
    vec: Vec<u8>,
}
```

有时候，我们希望对字符串进行索引、切片等操作，就可以使用以下结构，实现一个可索引、可切片的字符串，虽然会使用更多的存储空间。


```rust
struct MyString {
    vec: Vec<char>
}
```

同时，我们为 `MyString` 实现了 `Deref` 和 `DerefMut`：


```rust
use std::ops::{Deref, DerefMut};

impl Deref for MyString {
    type Target = Vec<char>;

    fn deref(&self) -> &Self::Target {
        &self.vec
    }
}

impl DerefMut for MyString {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.vec
    }
}
```

一旦实现了 `Deref`，我们就可以对 `MyString` 进行 `*` 操作：

```rust
fn main() {
    let my_string = MyString {
        vec: vec!['m', 'a', 'i', 'n', '.', 'r', 'u', 'n']
    };

    let vec: &Vec<char> = &*my_string;
}
```

当我们对 `MyString` 进行解引用时，实际上 Rust 会为我们调用 `*(my_string.deref())`, 上面代码等价于：

```rust
let vec: &Vec<char> = &*(my_string.deref());
```

Rust 首先会调用 `deref` 返回引用，再调用 `*` 进行解引用，最终获得目标值。上面的代码，我们在前面加了 `&` 是由于所有权系统的限制，不能将所有权转移给调用者。 同样，`deref` 返回一个引用，而不是直接返回值，也是因为所有权系统。

Rust 提供了一个及其有用的隐式转换： Deref coercion。

只要 `T` 实现了 `Deref<Target = U>`，并且 `x` 是类型 `T` 的值，就有：

- 在不可变的上下文中，`*x` 等价于 `*Deref::deref(&x)`;
- `&T` 类型的值被强制转换为 `&U` 类型的值；
- `T` 隐式实现了 `U` 的所有不可变方法。

对应的，`DerefMut` 是 `Deref` 的可变版本，只要 `T` 实现了 `DerefMut<Target = U>`，并且 `x` 是类型 `T` 的值，就有：

- 在可变的上下文中，`*x` 等价于 `*Deref::deref_mut(&mut x)`;
- `&mut T` 类型的值被强制转换为 `&mut U` 类型的值；
- `T` 隐式实现了 `U` 的所有可变方法。

基于这些规则，我们就可以直接：

```rust
let vec: &Vec<char> = &my_string;
let vec: &mut Vec<char> = &mut my_string;
```

或者直接调用 `Vec<T>` 的方法：

```rust
println!("len: {:?}", my_string.len());
println!("index 1: {:?}", my_string[1]);
println!("slice 1..4: {:?}", &my_string[1..4]);

my_string[5] = 'h';

for char in my_string.iter() {
    println!("{:?}", char);
}
```

`Deref` 的隐式转换不止于此，例如以下代码也是可以的：

```rust
let vec: &Vec<char> = &&&&&&&&&&&&&my_string;
let vec: &mut Vec<char> = &mut &mut &mut &mut &mut &mut my_string;
```

Rust 会尝试调用 `deref` 或 `deref_mut`，直到类型匹配成功。

再看以下代码：

```rust
use std::ops::Deref;

struct Person {
    name: Name
}

impl Deref for Person {
    type Target = Name;

    fn deref(&self) -> &Self::Target {
        &self.name
    }
}

struct Name(String);

impl Deref for Name {
    type Target = String;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

fn print_name(name: &str) {
    println!("{:?}", name);
}

fn main() {
    let person = Person {
        name: Name("main".to_string())
    };

    print_name(&person);
}
```

这段代码中，我们能将 `&Person` 当作 `&str` 传给 `print_name` 函数，也是因为 Rust 会尝试调用 `deref`, 直到匹配到合适的类型。

不过，有时候使用 `Deref` 会造成代码可读性下降，实际使用时还是要权衡。
