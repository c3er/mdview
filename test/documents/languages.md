# Hello World in different programming languages

## HTML

```html
<html>
    <head>
        <title>Hello, world!</title>
    </head>
    <body>
        <h1>Hello, world!</h1>
    </body>
</html>
```

## CSS

```css
body {
    color: black;
    font-family: Sans-serif;
    margin: 25px;
}
```

## JavaScript

```js
console.log("Hello, world!")
```

## C

```c
#include <stdio.h>

void main()
{
    puts("Hello, world!");
}
```

## C++

```cpp
#include <iostream>

int main()
{
    std::cout << "Hello, world!\n";
}
```

## C#

```csharp
using System;

internal class Program
{
    private static void Main()
    {
        Console.WriteLine("Hello, world!");
    }
}
```

## Java

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}
```

## Python

```python
print("Hello, world!")
```

## Visual Basic

```vb
Module Module1
    Sub Main()
        Console.WriteLine("Hello, world!")
    End Sub
End Module
```

## MS-DOS Assembly

```asm
; hello_world.asm intel
; Source: https://github.com/leachim6/hello-world

.model small

.stack 100h

.data
msg db "Hello world!",'$'

.code
main proc
        mov ax,@data
        mov ds, ax

; hello-world is there
        mov dx,offset msg
        mov ah,09
        int 21h

        mov ax,4c00h
        int 21h

main endp
end main
```

## PHP

```php
<?php
    echo 'Hello, world!';
?>
```

## SQL

```sql
SELECT ISBN, Title
FROM Books
WHERE Title = 'ET';
```

## Pascal

```pascal
program hello;
begin
    WriteLn('Hello, world!');
end.
```

## Ruby

```ruby
puts 'Hello, world!'
```

## Go

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, world")
}
```

## Swift

```swift
print("Hello, world!")
```

## R

```r
print("Hello, world!")
```

## Groovy

```groovy
print "Hello, world!"
```

## Perl

```perl
print "Hello, world!";
```

## MATLAB

```matlab
disp('Hello!')
```

## FORTRAN

```fortran
program helloworld
     print *, "Hello, world!"
end program helloworld
```

## Rust

```rust
fn main() {
    println!("Hello, world!");
}
```

## Unix Shell

```sh
echo Hello, world!
```

## Windows Batch

```cmd
echo Hello, world!
```

## Windows PowerShell

```powershell
Write-Output Hello, world!
```
