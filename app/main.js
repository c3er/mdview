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

const DEFAULT_FILE = path.join(__dirname, "..", "README.md")
const UPDATE_INTERVAL = 1000 // ms
const UPDATE_FILE_TIME_NAV_ID = "update-file-time"

let _isTest = false

let _mainWindow

let _lastModificationTime

let _isReloading = false
let _scrollPosition = 0

let _applicationSettings

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

function extractInternalTarget(args) {
    return args.find(arg => arg.startsWith("#"))
}

function determineCurrentFilePath(args) {
    if (navigation.hasCurrentLocation()) {
        return navigation.getCurrentLocation().filePath
    }
    return (
        args.find(
            arg =>
                arg !== process.execPath &&
                arg !== "." &&
                arg !== electron.app.getAppPath() &&
                arg !== "data:," &&
                !arg.startsWith("-") &&
                !arg.includes("spectron-menu-addon-v2")
        ) ?? DEFAULT_FILE
    )
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
        encoding || encodingLib.load(navigation.getCurrentLocation().filePath)
    )
}

function restorePosition() {
    _mainWindow.webContents.send(ipc.messages.restorePosition, _scrollPosition)
}

function createWindow() {
    const documentSettings = storage.initDocumentSettings(
        storage.getDefaultDir(),
        storage.DOCUMENT_SETTINGS_FILE,
        determineCurrentFilePath(process.argv)
    )
    const windowPosition = documentSettings.windowPosition

    const mainWindow = new electron.BrowserWindow({
        x: windowPosition.x,
        y: windowPosition.y,
        width: windowPosition.width,
        height: windowPosition.height,
        backgroundColor: "#fff",
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    })
    mainWindow.loadFile(path.join(__dirname, "index.html"))
    mainWindow.on("close", () => {
        const documentSettings = storage.initDocumentSettings(
            storage.getDefaultDir(),
            storage.DOCUMENT_SETTINGS_FILE,
            determineCurrentFilePath(process.argv)
        )
        const position = mainWindow.getBounds()
        documentSettings.windowPosition = {
            x: position.x,
            y: position.y,
            width: position.width,
            height: position.height,
        }
    })
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

    electron.nativeTheme.themeSource = _applicationSettings.theme

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
                                openFile(filePath, null, encodingLib.load(filePath))
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
                        _applicationSettings.theme = electron.nativeTheme.shouldUseDarkColors
                            ? _applicationSettings.LIGHT_THEME
                            : _applicationSettings.DARK_THEME
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
                    encodingLib.change(navigation.getCurrentLocation().filePath, encoding)
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

    storage.init()
    _applicationSettings = storage.initApplicationSettings(
        storage.getDefaultDir(),
        storage.APPLICATION_SETTINGS_FILE
    )

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

    const filePath = determineCurrentFilePath(args)
    openFile(filePath, extractInternalTarget(args), encodingLib.load(filePath))
})

electron.ipcMain.on(ipc.messages.reloadPrepared, (_, isFileModification, encoding, position) => {
    _scrollPosition = position
    _isReloading = true

    const currentLocation = navigation.getCurrentLocation()
    const filePath = currentLocation.filePath
    if (isFileModification) {
        navigation.reloadCurrent(position)
    } else {
        encodingLib.change(filePath, encoding)
        _mainWindow.reload()
    }

    restorePosition()
})

electron.ipcMain.on(ipc.messages.openFileInNewWindow, (_, filePath) => createChildWindow(filePath))

electron.ipcMain.on(ipc.messages.openInternalInNewWindow, (_, target) =>
    createChildWindow(navigation.getCurrentLocation().filePath, target)
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
    if (navigation.hasCurrentLocation()) {
        const filePath = navigation.getCurrentLocation().filePath
        fs.stat(filePath, (err, stats) => {
            if (err) {
                console.error(`Updating file "${filePath}" was aborted with error ${err}`)
                return
            }
            let mtime = stats.mtimeMs
            if (_lastModificationTime && mtime !== _lastModificationTime) {
                console.debug("Reloading...")
                _lastModificationTime = mtime
                reload(true)
            }
        })
    }
}, UPDATE_INTERVAL)

navigation.register(UPDATE_FILE_TIME_NAV_ID, lastModificationTime => {
    const time = _lastModificationTime
    _lastModificationTime = lastModificationTime
    return time
})
