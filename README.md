# Markdown Viewer

A standalone application that renders and displays Markdown files. It does nothing else! No direct editing nor any fancy note taking features. It is not distributed as a browser extension nor does it fire up a web server - so no web browser is needed to see the rendered Markdown file.

## Developing

The tool is developed and tested only under Windows 10 yet.

Node.js including the NPM package manager is needed.

After cloning the Git repository type `npm install`. NPM may put some warnings while installing the packages.

To start an instance while development type `npm start`. You can open the Electron development tools by calling the main menu "Tools" -> "Developer tools" or by pressing the F10 key.

Binaries can be built by typing `npm run dist`. Under Windows, a ZIP package and a Setup.exe will be built. Other operating systems are not tested yet and there are properly some settings missing to build the proper packages. Pull requests are welcome.

The icon is made with help of [Inkscape](https://inkscape.org/en/) and [ImageMagick](https://www.imagemagick.org). While the application icon does not look too bad, a proper icon for Markdown *documents* is missing yet. Operating systems other than Windows are not regarded yet.

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

The renderer process (`index.html` and `index.json`) must be debugged with help of the Electron development tools. 

## Copyright and License

This tool is made by Christian Dreier. If you find a copy somewhere, you find the original at [GitHub](https://github.com/c3er/mdview).

You can use and copy this tool under the conditions of the MIT license.

## Todo

### Features / Bugs

A refresh/update feature to update the document without the need to restart the tool

Links that target inside of documents (starting with `#`) are misinterpreted. The tool shall open a new window where the document is scrolled to the link target.

External resources that are loaded from the Internet shall be blocked

A context menu:

- Copy currently selected text
- Copy link text
- Copy link target
