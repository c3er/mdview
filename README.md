# Markdown Viewer

A standalone application that renders and displays Markdown files. It does nothing else! No direct editing nor any fancy note taking features. It is not distributed as a browser extension nor does it fire up a web server - so no web browser is needed to see the rendered Markdown file.

## Developing

The tool is developed and tested only under Windows (7 and newer) 64 Bit yet.

Node.js including the NPM package manager is needed.

After cloning the Git repository, type `npm install`. NPM may put some warnings while installing the packages.

To start an instance while development, type `npm start`.

Binaries can be built by typing `npm run dist`. Under Windows, a ZIP package and a Setup.exe will be built. Under Linux, an AppImage file will be generated - though it is not tested by the author yet. MacOS is not tested yet and there are properly some settings missing to build the proper packages. Pull requests are welcome!

The icon is made with help of [Inkscape](https://inkscape.org/en/) and [ImageMagick](https://www.imagemagick.org). While the application icon does not look too bad, a proper icon for Markdown *documents* is missing yet.

### Debugging

It is possible to debug the main process with [Visual Studio Code](https://code.visualstudio.com/). For debugging inside of VS Code, the file `.vscode/launch.json` in the project directory has to be edited (just copy & paste the code below):

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Main Process",
            "type": "node",
            "request": "launch",
            "cwd": "${workspaceRoot}",
            "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/electron",
            "windows": {
                "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/electron.cmd"
            },
            "args": ["."]
        }
    ]
}
```

This `launch.json` is taken from the [Electron documentation](https://electronjs.org/docs/tutorial/debugging-main-process-vscode).

The renderer process (`index.html` and `index.js`) must be debugged with help of the Electron development tools by calling in the main menu "Tools" -> "Developer tools" or by pressing the F10 key.

## Copyright and License

This tool is made by Christian Dreier. If you find a copy somewhere, you find the original at [GitHub](https://github.com/c3er/mdview).

You can use and copy this tool under the conditions of the MIT license.

## Todo

- Remember position of last opened window
    - Additional windows shall not open at the same place as the last window
- Recognize the character encoding to display special characters correctly, even if the document is not encoded with UTF-8
