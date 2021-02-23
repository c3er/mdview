"use strict";

const fs = require("fs")
const path = require("path")
const url = require("url")

const childProcess = require("child_process")
const electron = require("electron")

const common = require("./lib/common")
const encodingStorage = require("./lib/encodingStorage")
const ipc = require("./lib/ipc")

const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

const DEFAULT_FILE = path.join(__dirname, "..", "README.md")
const UPDATE_INTERVAL = 1000 // ms

// Based on https://encoding.spec.whatwg.org/
const ENCODINGS = [
    "UTF-8",
    "IBM866",
    "ISO-8859-2",
    "ISO-8859-3",
    "ISO-8859-4",
    "ISO-8859-5",
    "ISO-8859-6",
    "ISO-8859-7",
    "ISO-8859-8",
    "ISO-8859-8-I",
    "ISO-8859-10",
    "ISO-8859-13",
    "ISO-8859-14",
    "ISO-8859-15",
    "ISO-8859-16",
    "KOI8-R",
    "KOI8-U",
    "macintosh",
    "windows-874",
    "windows-1250",
    "windows-1251",
    "windows-1252",
    "windows-1253",
    "windows-1254",
    "windows-1255",
    "windows-1256",
    "windows-1257",
    "windows-1258",
    "x-mac-cyrillic",
    "GBK",
    "gb18030",
    "Big5",
    "EUC-JP",
    "ISO-2022-JP",
    "Shift_JIS",
    "EUC-KR",
    "UTF-16BE",
    "UTF-16LE",
]

let _mainWindow
let _mainMenu

let _currentFilePath
let _internalTarget
let _lastModificationTime

let _contentIsBlocked = false
const _unblockedURLs = []

let _isReloading = false
let _scrollPosition = 0

let _isInRawView = false

function error(msg) {
    console.log("Error:", msg)
    electron.dialog.showErrorBox("Error", `${msg}. Exiting.`)
    process.exit(1)
}

function openFile(filePath, internalTarget, encoding) {
    if (!fs.existsSync(filePath)) {
        error(`Unknown file: "${filePath}"`)
    } else if (!fs.lstatSync(filePath).isFile()) {
        error("Given path does not lead to a file")
    } else {
        _currentFilePath = filePath
        changeEncoding(filePath, encoding)
        _internalTarget = internalTarget
        _lastModificationTime = fs.statSync(filePath).mtimeMs
        _mainWindow.webContents.send("fileOpen", filePath, internalTarget, encoding)
    }
}

function extractFilePath(args) {
    return args.find(arg =>
        arg !== process.execPath &&
        arg !== "." &&
        arg !== electron.app.getAppPath() &&
        arg !== "data:," &&
        !arg.startsWith("-") &&
        !arg.includes("node_modules"))
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

function unblockURL(url) {
    console.log(`Unblocked: ${url}`)
    _unblockedURLs.push(url)
}

function enterRawTextView(shallEnterRawTextView) {
    _isInRawView = shallEnterRawTextView
    _mainWindow.webContents.send(shallEnterRawTextView
        ? ipc.messages.viewRawText
        : ipc.messages.leaveRawText)
}

function allowUnblockContent(isAllowed) {
    _mainMenu.getMenuItemById("unblock-content").enabled = isAllowed
}

function reload(isFileModification, encoding) {
    _mainWindow.webContents.send(
        ipc.messages.prepareReload,
        isFileModification,
        encoding || encodingStorage.load(_currentFilePath))
}

function getEncodingId(encoding) {
    return `encoding-${encoding}`
}

function changeEncoding(filePath, encoding) {
    encodingStorage.save(filePath, encoding)
    _mainMenu.getMenuItemById(getEncodingId(encoding)).checked = true
}

function restorePosition() {
    _mainWindow.webContents.send(ipc.messages.restorePosition, _scrollPosition)
}

function createWindow() {
    _mainWindow = new electron.BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        backgroundColor: "#fff",
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
        }
    })
    _mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "index.html"),
            protocol: "file:",
            slashes: true
        })
    )
    _mainWindow.on("closed", () => _mainWindow = null)
    _mainWindow.webContents.on("did-finish-load", () => {
        if (_isReloading) {
            restorePosition()
            _isReloading = false
        }
    })

    _mainMenu = electron.Menu.buildFromTemplate([
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
                                filters: [{ name: "Markdown", extensions: common.FILE_EXTENSIONS }]
                            })
                            if (!result.canceled) {
                                const filePath = result.filePaths[0]
                                openFile(filePath, _internalTarget, encodingStorage.load(filePath))
                            }
                        } catch (e) {
                            error(`Problem at opening file:\n ${e}`)
                        }
                    }
                },
                {
                    label: "Print",
                    accelerator: "Ctrl+P",
                    click() {
                        _mainWindow.webContents.print()
                    }
                },
                {
                    label: "Settings",
                    accelerator: "Ctrl+Shift+s",
                    click() {
                        
                    }
                },
                { type: "separator" },
                {
                    label: "Quit",
                    accelerator: "Esc",
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
                        reload(false)
                    }
                },
                {
                    label: "Unblock All External Content",
                    accelerator: "Alt+U",
                    id: "unblock-content",
                    click() {
                        _mainWindow.webContents.send(ipc.messages.unblockAll)
                    }
                },
                {
                    label: "View Raw Text",
                    accelerator: "Ctrl+U",
                    id: "view-raw-text",
                    click() {
                        enterRawTextView(!_isInRawView)
                    }
                }
            ]
        },
        {
            label: "Encoding",
            submenu: ENCODINGS.map(encoding => ({
                label: encoding,
                type: "radio",
                id: getEncodingId(encoding),
                click() {
                    changeEncoding(_currentFilePath, encoding)
                    reload(true, encoding)
                }
            }))
        },
        {
            label: "Tools",
            submenu: [
                {
                    label: "Developer Tools",
                    accelerator: "F10",
                    click() {
                        _mainWindow.webContents.openDevTools()
                    }
                }
            ]
        },
    ])
    electron.Menu.setApplicationMenu(_mainMenu)
}

electron.app.on("ready", () => {
    encodingStorage.init()
    createWindow()

    const webRequest = electron.session.defaultSession.webRequest
    webRequest.onBeforeRequest((details, callback) => {
        const url = details.url
        const isBlocked = common.isWebURL(url) && !_unblockedURLs.includes(url)
        console.log(`${isBlocked ? "Blocked" : "Loading"}: ${url}`)
        callback({ cancel: isBlocked })
        if (isBlocked) {
            _contentIsBlocked = true
            _mainWindow.webContents.send("contentBlocked", url)
        }
        allowUnblockContent(_contentIsBlocked)
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

electron.ipcMain.on(ipc.messages.finishLoad, () => {
    const args = process.argv
    console.log(args)

    const filePath = _currentFilePath === undefined ? extractFilePath(args) : _currentFilePath
    const internalTarget = extractInternalTarget(args)
    if (filePath !== undefined) {
        openFile(filePath, internalTarget, encodingStorage.load(filePath))
    } else {
        openFile(DEFAULT_FILE, internalTarget, encodingStorage.load(DEFAULT_FILE))
    }
})

electron.ipcMain.on(ipc.messages.openFile, (_, filePath) => createChildWindow(filePath))

electron.ipcMain.on(ipc.messages.openInternal, (_, target) => createChildWindow(_currentFilePath, target))

electron.ipcMain.on(ipc.messages.unblockURL, (_, url) => unblockURL(url))

electron.ipcMain.on(ipc.messages.allContentUnblocked, () => {
    _contentIsBlocked = false
    allowUnblockContent(false)
})

electron.ipcMain.on(ipc.messages.disableRawView, () => {
    enterRawTextView(false)
    _mainMenu.getMenuItemById("view-raw-text").enabled = false
})

electron.ipcMain.on(ipc.messages.reloadPrepared, (_, isFileModification, encoding, position) => {
    _scrollPosition = position
    _isReloading = true
    if (isFileModification) {
        openFile(_currentFilePath, _internalTarget, encoding)
    } else {
        changeEncoding(_currentFilePath, encoding)
        _mainWindow.reload()
    }
    restorePosition()
})

setInterval(
    () => {
        if (_currentFilePath) {
            fs.stat(_currentFilePath, (err, stats) => {
                if (err) {
                    console.error(`Updating file "${_currentFilePath}" was aborted with error ${err}`)
                    return
                }
                let mtime = stats.mtimeMs
                if (mtime !== _lastModificationTime) {
                    console.log("Reloading...")
                    _lastModificationTime = mtime
                    reload(true)
                }
            })
        }
    },
    UPDATE_INTERVAL)
