# Not able to build installer/uninstaller (ERR_ELECTRON_BUILDER_CANNOT_EXECUTE)

[Back to README](../README.md)

You may encounter some difficulties when trying to build the electron distribution: the build is able to create the windows application and to zip it properly but will fail while creating the installer/uninstaller applications.

Hence: you may use the packed/unpacked application to do a manual "*portable*" installation but you cannot use the installer/uninstaller.

Fortunately, there's maybe a quick-fix for this (see below)...

## Summary of the issue

* **Description**: not able to build installer/uninstaller
* **Error**: ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
* **Environment**: windows 10+ (10.0.19043)
* **Reproduce**: see below
* **Electron-Builder Version**: 22.11.7
* **Node Version**: 16.8.0
* **Electron Version**: 13.1.9
* **Target**: nsis
* **GitHub issue**: <https://github.com/electron-userland/electron-builder/issues/6235>

## Cause analysis

When running the builder for the first time, some binaries packages are **downloaded into a cache folder**.
Th folder is usually situated under the user´s appdata local directory, e.g. `C:\Users\<username>\AppData\Local\electron-builder\Cache\nsis\...`

In case the **path** -- in particular due to the `<username>` mentioned above -- to the cache folder is **containing non-ascii characters** (e.g. UTF-8), the builder may **fail** at loading some plugins/executing some of the binaries of the cache: the path is not correctly interpreted...

It seems, that the builder is capturing the output of the "powershell" environment, which output (stderr) is by default using ASCII encoding, which is conflicting with the non-ascii name of the cache path.

## Quick-fix / temporary solution

Set the following environment variable

```shell
set ELECTRON_BUILDER_CACHE=C:\TEMP
```

before running the electron-builder command. When running, the command will download the binaries explicitly to the folder defined in the "env" variable (ensure the path does not contain any non-ASCII characters)

## How to reproduce the issue

Set the "env" variable to point to a path containing non-ASCII characters prior running the build command. E.g.:

```shell
set ELECTRON_BUILDER_CACHE=C:\T€ST
```

Note the usage of the "€" (Euro currency sign)
