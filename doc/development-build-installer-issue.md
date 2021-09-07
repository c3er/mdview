# not able to build installer/uninstaller (ERR_ELECTRON_BUILDER_CANNOT_EXECUTE)

[back to README](../README.md)

you may encounter some difficulties when trying to build the electron distribution:
the build is able to create the windows application and to zip it properly but will fail while creating the installer/uninstaller applications.

Hence: you may use the packed/unpacked application to do a manual "*portable*" installation but you cannot use the installer/uninstaller.

Fortunatelly, there's maybe a quick-fix for this (see below)...

## Summary of the issue

* **description**: not able to build installer/uninstaller
* **error**: ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
* **env**: windows 10+ (10.0.19043)
* **reproduce**: see below
* **Electron-Builder Version**: 22.11.7
* **Node Version**: 16.8.0
* **Electron Version**: 13.1.9
* **Target**: nsis
* **github issue**: <https://github.com/electron-userland/electron-builder/issues/6235>

## Cause analysis

when running the builder for the first time, some binaries packages are **downloaded into a cache folder**.
Th folder is usually situated unter the user´s appdata local directory e.g. `C:\Users\<username>\AppData\Local\electron-builder\Cache\nsis\...`

In case the **path** - in particular due to the `<username>` mentioned above - to the cache folder is **containing non-ascii chars** (e.g. utf8 chars), the builder may **fail** at loading some plugins/executing some of the binaries ou of the cache: the path is not correctly interpreted...

it seems, that the builder is capturing the output of the "powershell" environment, which output (stderr) is by default using ascii encoding... which is conflicting with the non-ascii name of the cache path.

## Quick-Fix / temporary **Solution**

set the following environment variable

```shell
set ELECTRON_BUILDER_CACHE=C:\TEMP
```

before running the electron-builder command. When running, the command will download the binaries explicitly to the folder defined in the env variable (ensure the path does not contain any non-ascii char)

## How to **reproduce** the issue

set the env variable to point to a path containing non-ascii chars prior running the build command. E.g.:

```shell
set ELECTRON_BUILDER_CACHE=C:\T€ST
```

note the usage of the "€" (Euro currency sign)
