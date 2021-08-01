"use strict"

const fs = require("fs")
const path = require("path")

const childProcess = require("child_process")
const electron = require("electron")

const common = require("./lib/common")
const contentBlocking = require("./lib/contentBlocking/contentBlockingMain")
const encodingLib = require("./lib/main/encoding")
const ipc = require("./lib/ipc")
const navigation = require("./lib/navigation/navigationMain")
const rawText = require("./lib/rawText/rawTextMain")
const storage = require("./lib/main/storage")

const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

const DEFAULT_FILE = path.join(__dirname, "..", "README.md")
const UPDATE_INTERVAL = 1000 // ms

let _isTest = false

let _mainWindow

let _currentFilePath
let _internalTarget
let _lastModificationTime

let _isReloading = false
let _scrollPosition = 0

let _settings

function error(msg) {
    console.error("Error:", msg)
    electron.dialog.showErrorBox("Error", `${msg}. Exiting.`)
    process.exit(1)
}

function openFile(filePath, internalTarget, encoding) {
    if (!fs.existsSync(filePath)) {
        error(`Unknown file: "${filePath}"`)
    } else if (!fs.lstatSync(filePath).isFile()) {
        error("Given path does not lead to a file")
    } else {
        navigation.go(filePath, internalTarget, encoding)
        _lastModificationTime = fs.statSync(filePath).mtimeMs
    }
}

function extractFilePath(args) {
    return args
        .find(
            arg =>
                arg !== process.execPath &&
                arg !== "." &&
                arg !== electron.app.getAppPath() &&
                arg !== "data:," &&
                !arg.startsWith("-") &&
                !arg.includes("spectron-menu-addon-v2")
        )
        ?.replace(/\\\\/g, "\\")
}

function extractInternalTarget(args) {
    return args.find(arg => arg.startsWith("#"))
}

function createChildWindow(filePath, internalTarget) {
    const processName = process.argv[0]
    const args = processName.includes("electron") ? [".", filePath] : [filePath]
    if (internalTarget !== undefined) {
        args.push(internalTarget)
    }
    childProcess.spawn(processName, args)
}

function reload(isFileModification, encoding) {
    _mainWindow.webContents.send(
        ipc.messages.prepareReload,
        isFileModification,
        encoding || encodingLib.load(_currentFilePath)
    )
}

function restorePosition() {
    _mainWindow.webContents.send(ipc.messages.restorePosition, _scrollPosition)
}

function createWindow() {
    const mainWindow = new electron.BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        backgroundColor: "#fff",
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    })
    mainWindow.loadFile(path.join(__dirname, "index.html"))
    mainWindow.on("closed", () => (_mainWindow = null))
    mainWindow.webContents.on("did-finish-load", () => {
        if (_isReloading) {
            restorePosition()
            _isReloading = false
        }
    })
    mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.type === "keyDown" && input.key === "Backspace") {
            event.preventDefault()
            navigation.back()
        }
    })

    electron.nativeTheme.themeSource = _settings.theme

    const mainMenu = electron.Menu.buildFromTemplate([
        {
            label: "File",
            submenu: [
                {
                    label: "Open",
                    accelerator: "CmdOrCtrl+O",
                    async click() {
                        try {
                            const result = await electron.dialog.showOpenDialog({
                                properties: ["openFile"],
                                filters: [
                                    {
                                        name: "Markdown",
                                        extensions: common.FILE_EXTENSIONS,
                                    },
                                ],
                            })
                            if (!result.canceled) {
                                const filePath = result.filePaths[0]
                                openFile(filePath, _internalTarget, encodingLib.load(filePath))
                            }
                        } catch (e) {
                            error(`Problem at opening file:\n ${e}`)
                        }
                    },
                },
                {
                    label: "Print",
                    accelerator: "Ctrl+P",
                    click() {
                        mainWindow.webContents.print()
                    },
                },
                { type: "separator" },
                {
                    label: "Quit",
                    accelerator: "Esc",
                    click() {
                        mainWindow.close()
                    },
                },
            ],
        },
        {
            label: "Edit",
            submenu: [{ role: "copy" }],
        },
        {
            label: "View",
            submenu: [
                {
                    label: "Back",
                    accelerator: "Alt+Left",
                    id: navigation.BACK_MENU_ID,
                    click() {
                        navigation.back()
                    },
                },
                {
                    label: "Forward",
                    accelerator: "Alt+Right",
                    id: navigation.FORWARD_MENU_ID,
                    click() {
                        navigation.forward()
                    },
                },
                { type: "separator" },
                {
                    label: "Refresh",
                    accelerator: "F5",
                    click() {
                        reload(false)
                    },
                },
                {
                    label: "Unblock All External Content",
                    accelerator: "Alt+U",
                    id: contentBlocking.UNBLOCK_CONTENT_MENU_ID,
                    click() {
                        contentBlocking.unblockAll()
                    },
                },
                {
                    label: "View Raw Text",
                    accelerator: "Ctrl+U",
                    id: rawText.VIEW_RAW_TEXT_MENU_ID,
                    click() {
                        rawText.switchRawView()
                    },
                },
                { type: "separator" },
                {
                    label: "Switch Theme",
                    click() {
                        _settings.theme = electron.nativeTheme.shouldUseDarkColors
                            ? _settings.LIGHT_THEME
                            : _settings.DARK_THEME
                    },
                },
            ],
        },
        {
            label: "Encoding",
            submenu: encodingLib.ENCODINGS.map(encoding => ({
                label: encoding,
                type: "radio",
                id: encodingLib.toId(encoding),
                click() {
                    encodingLib.change(_currentFilePath, encoding)
                    reload(true, encoding)
                },
            })),
        },
        {
            label: "Tools",
            submenu: [
                {
                    label: "Developer Tools",
                    accelerator: "F10",
                    click() {
                        mainWindow.webContents.openDevTools()
                    },
                },
            ],
        },
    ])
    electron.Menu.setApplicationMenu(mainMenu)

    return [mainWindow, mainMenu]
}

electron.app.on("ready", () => {
    require("@electron/remote/main").initialize()

    _isTest = process.argv.includes("--test")
    _settings = storage.initSettings(storage.getDefaultDir(), storage.SETTINGS_FILE)

    const [mainWindow, mainMenu] = createWindow()
    _mainWindow = mainWindow

    navigation.init(mainWindow, mainMenu)
    encodingLib.init(mainMenu)
    contentBlocking.init(mainWindow, mainMenu)
    rawText.init(mainWindow, mainMenu)
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

electron.ipcMain.on(ipc.messages.finishLoad, () => {
    const args = process.argv
    console.debug(args)

    const filePath = _currentFilePath === undefined ? extractFilePath(args) : _currentFilePath
    const internalTarget = extractInternalTarget(args)
    if (filePath !== undefined) {
        openFile(filePath, internalTarget, encodingLib.load(filePath))
    } else {
        openFile(DEFAULT_FILE, internalTarget, encodingLib.load(DEFAULT_FILE))
    }
})

electron.ipcMain.on(ipc.messages.reloadPrepared, (_, isFileModification, encoding, position) => {
    _scrollPosition = position
    _isReloading = true
    if (isFileModification) {
        openFile(_currentFilePath, _internalTarget, encoding)
    } else {
        encodingLib.change(_currentFilePath, encoding)
        _mainWindow.reload()
    }
    restorePosition()
})

electron.ipcMain.on(ipc.messages.openFileInNewWindow, (_, filePath) => createChildWindow(filePath))

electron.ipcMain.on(ipc.messages.openInternalInNewWindow, (_, target) =>
    createChildWindow(_currentFilePath, target)
)

// Based on https://stackoverflow.com/a/50703424/13949398 (custom error window/handling in Electron)
process.on("uncaughtException", error => {
    console.error(`Unhandled error: ${error.stack}`)
    if (!_isTest) {
        electron.dialog.showMessageBoxSync({
            type: "error",
            title: "Unhandled error (fault of Markdown Viewer)",
            message: error.stack,
        })
    }
    electron.app.exit(1)
})

setInterval(() => {
    if (_currentFilePath) {
        fs.stat(_currentFilePath, (err, stats) => {
            if (err) {
                console.error(`Updating file "${_currentFilePath}" was aborted with error ${err}`)
                return
            }
            let mtime = stats.mtimeMs
            if (mtime !== _lastModificationTime) {
                console.debug("Reloading...")
                _lastModificationTime = mtime
                reload(true)
            }
        })
    }
}, UPDATE_INTERVAL)
