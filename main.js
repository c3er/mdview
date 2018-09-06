const electron = require("electron")
const childProcess = require("child_process")
const path = require("path")
const url = require("url")
const fs = require("fs")

const common = require("./lib/common")

const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

const FILE_EXTENSIONS = ["md", "markdown"]

let _mainWindow
let _currentFilePath
const _unblockedURLs = []

function error(msg) {
    dialog.showErrorBox("Error", `${msg}. Exiting.`)
    process.exit(1)
}

function openFile(filePath, internalTarget) {
    if (!fs.existsSync(filePath)) {
        error(`Unknown file: "${filePath}"`)
    } else if (!fs.lstatSync(filePath).isFile()) {
        error("Given path leads to directory")
    } else {
        _currentFilePath = filePath
        _mainWindow.webContents.send("fileOpen", filePath, internalTarget)
    }
}

const extractFilePath = args => args.find(
    arg =>
        !arg.includes("electron") &&
        !arg.startsWith("-") &&
        arg != "." &&
        arg != process.execPath)

const extractInternalTarget = args => args.find(arg => arg.startsWith("#"))

function createChildWindow(filePath, internalTarget) {
    const processName = process.argv[0]
    const args = processName.includes("electron") ? [".", filePath] : [filePath]
    if (internalTarget !== undefined) {
        args.push(internalTarget)
    }
    childProcess.spawn(processName, args)
}

function unblockURL(url) {
    console.log(`Unblocked: ${url}`)
    _unblockedURLs.push(url)
}

function createWindow() {
    _mainWindow = new electron.BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        backgroundColor: "#fff"
    })
    _mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "index.html"),
            protocol: "file:",
            slashes: true
        })
    )
    _mainWindow.on("closed", () => {
        _mainWindow = null
    })

    electron.Menu.setApplicationMenu(
        electron.Menu.buildFromTemplate([
            {
                label: "File",
                submenu: [
                    {
                        label: "Open",
                        accelerator: "CmdOrCtrl+O",
                        click() {
                            electron.dialog.showOpenDialog(
                                {
                                    properties: ["openFile"],
                                    filters: [{ name: "Markdown", extensions: common.FILE_EXTENSIONS }]
                                },
                                filePaths => {
                                    if (filePaths) {
                                        openFile(filePaths[0])
                                    }
                                }
                            )
                        }
                    },
                    {
                        label: "Quit",
                        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
                        click() {
                            _mainWindow.close()
                        }
                    }
                ]
            },
            {
                label: "Edit",
                submenu: [
                    { role: "copy" }
                ]
            },
            {
                label: "View",
                submenu: [
                    {
                        label: "Refresh",
                        accelerator: "F5",
                        click() {
                            _mainWindow.reload()
                        }
                    }
                ]
            },
            {
                label: "Tools",
                submenu: [
                    {
                        label: "Developer tools",
                        accelerator: "F10",
                        click() {
                            _mainWindow.webContents.openDevTools()
                        }
                    }
                ]
            }
        ])
    )
}

electron.app.on("ready", () => {
    createWindow()

    const webRequest = electron.session.defaultSession.webRequest
    webRequest.onBeforeRequest((details, callback) => {
        const url = details.url
        const isBlocked = common.isWebURL(url) && !_unblockedURLs.includes(url)
        console.log(`${isBlocked ? "Blocked" : "Loading"}: ${url}`)
        callback({ cancel: isBlocked })
        if (isBlocked) {
            _mainWindow.webContents.send("contentBlocked", url)
        }
    })
    webRequest.onBeforeRedirect(details => {
        const url = details.redirectURL
        console.log("Redirecting: " + url)
        unblockURL(url)
    })
})

electron.app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        electron.app.quit()
    }
})

electron.app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (_mainWindow === null) {
        createWindow()
    }
})

electron.ipcMain.on("finishLoad", () => {
    const args = process.argv
    console.log(args)

    const filePath = _currentFilePath === undefined ? extractFilePath(args) : _currentFilePath
    const internalTarget = extractInternalTarget(args)
    if (filePath !== undefined) {
        openFile(filePath, internalTarget)
    } else {
        openFile(path.join(__dirname, "README.md"), internalTarget)
    }
})

electron.ipcMain.on("openFile", (event, filePath) => createChildWindow(filePath))

electron.ipcMain.on("openInternal", (event, target) => createChildWindow(_currentFilePath, target))

electron.ipcMain.on("unblockURL", (event, url) => unblockURL(url))
