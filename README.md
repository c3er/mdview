# Markdown Viewer

![Screenshot of the application in light mode](doc/assets/screenshot-light.png)

![Screenshot of the application in dark mode](doc/assets/screenshot-dark.png)

A standalone application that renders and displays Markdown files. It does nothing else! No direct editing nor any fancy note taking features. It is not distributed as a browser extension nor does it fire up a web server - so no web browser is needed to see the rendered Markdown file.

See [the flavor documentation](doc/flavor.md) for Markdown features additional to [GitHub Flavored Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github).

## Installation and usage

You find the latest binaries and setup file [at GitHub](https://github.com/c3er/mdview/releases/latest). 

Package formats:

- **Windows:** Setup-exe, ZIP archive
- **Linux:** AppImage package
- **macOS:** DMG package

### Windows

The Windows setup file supports following parameters:

- `/S` runs the setup silently, i.e. in the background, without UI and without asking any questions.
- `/D=C:\path\to\install` sets the installation directory. This parameter has to be the last one. The path must not contain quotes, even if the path contains whitespaces.

#### winget

The application can be installed via [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/):

```
winget install c3er.mdview
```

#### Scoop

The application can be installed via [Scoop](https://scoop.sh/):

```
scoop install https://github.com/c3er/mdview/releases/latest/download/mdview.json
```

## Known issues

### Windows installation and download security

Issues occurred with browser download security features and Windows SmartScreen. I checked both, the Windows Setup-EXE and the ZIP file in [VirusTotal](https://www.virustotal.com) and no engine detected anything at upload time.

I don't know yet, how to prevent these blockings without paying an annual fee.

### Startup speed

The application may have a delay at startup. This delay may be caused by Windows Defender. See [my comment in Electron issue #29868](https://github.com/electron/electron/issues/29868#issuecomment-869049066) and [this StackOverflow question](https://stackoverflow.com/questions/67982430/windows-defender-slowing-down-electron-startup). Other virus scanner may also cause a delay.

As a workaround to remove this delay, you can add the path to the `mdview.exe` to the exclusion list of your virus scanner. The default installation path of the setup file are:

- `C:\Program Files\mdview` for system wide installation
- `%appdata%\..\Local\Programs\mdview` for installation in the user account (non elevated)

### Build error ERR_ELECTRON_BUILDER_CANNOT_EXECUTE (development)

You may encounter some issue when trying to build the Electron distribution (binaries) i.e. the build may (partially) fail.

A possible fix is described here [not able to build installer/uninstaller (ERR_ELECTRON_BUILDER_CANNOT_EXECUTE)](./doc/development-build-installer-issue.md)

## Developing

See the [CONTRIBUTING](CONTRIBUTING.md) file.

## Copyright and License

This tool is made by Christian Dreier. If you find a copy somewhere, you find the original at [GitHub](https://github.com/c3er/mdview).

You can use and copy this tool under the conditions of the MIT license.

## Further notes

There is [a fork of this project](https://github.com/khatastroffik/mdview) by [Loïs Bégué](https://github.com/khatastroffik).
