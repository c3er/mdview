"use strict"

const fs = require("fs")
const path = require("path")

const aboutWindow = require("about-window")
const childProcess = require("child_process")
const electron = require("electron")
const remote = require("@electron/remote/main")

const cli = require("./lib/main/cli")
const common = require("./lib/common")
const contentBlocking = require("./lib/contentBlocking/contentBlockingMain")
const documentRendering = require("./lib/documentRendering/documentRenderingMain")
const encodingLib = require("./lib/encoding/encodingMain")
const ipc = require("./lib/ipc")
const log = require("./lib/log/log")
const navigation = require("./lib/navigation/navigationMain")
const rawText = require("./lib/rawText/rawTextMain")
const storage = require("./lib/main/storage")

const UPDATE_INTERVAL = 1000 // ms
const UPDATE_FILE_TIME_NAV_ID = "update-file-time"
const ZOOM_STEP = 0.1

let _cliArgs
let _isTest = false

let _mainWindow
let _mainMenu

let _lastModificationTime

let _isReloading = false
let _scrollPosition = 0

let _applicationSettings

function error(msg) {
    log.error("Error:", msg)
    electron.dialog.showErrorBox("Error", `${msg}. Exiting.`)
    process.exit(1)
}

function showAboutDialog(parentWindow) {
    const POSITION_OFFSET = 20
    const parentPosition = parentWindow.getBounds()

    const aboutDialog = aboutWindow.default({
        adjust_window_size: true,
        copyright: "Copyright © Christian Dreier",
        icon_path: path.join(__dirname, "..", "icon", "md-icon.svg"),
        package_json_dir: path.join(__dirname, ".."),
        product_name: "Markdown Viewer",
        win_options: {
            maximizable: false,
            minimizable: false,
            modal: true,
            parent: parentWindow,
            resizable: false,
            skipTaskbar: true,
            title: "About Markdown Viewer",
            x: parentPosition.x + POSITION_OFFSET,
            y: parentPosition.y + POSITION_OFFSET,
        },
    })
    aboutDialog.webContents.on("before-input-event", (event, input) => {
        if (input.key === "Escape") {
            aboutDialog.close()
            event.preventDefault()
        }
    })
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

function loadDocumentSettings() {
    return storage.loadDocumentSettings(
        storage.dataDir,
        storage.DOCUMENT_SETTINGS_FILE,
        determineCurrentFilePath()
    )
}

function determineCurrentFilePath() {
    return navigation.hasCurrentLocation()
        ? navigation.getCurrentLocation().filePath
        : _cliArgs.filePath
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
        encoding ?? encodingLib.load(navigation.getCurrentLocation().filePath)
    )
}

function restorePosition() {
    _mainWindow.webContents.send(ipc.messages.restorePosition, _scrollPosition)
}

function setZoom(zoomFactor) {
    _applicationSettings.zoom = zoomFactor
    _mainWindow.webContents.send(ipc.messages.changeZoom, _applicationSettings.zoom)
}

function zoomIn() {
    setZoom(_applicationSettings.zoom + ZOOM_STEP)
}

function zoomOut() {
    const minZoom = 0.1
    let zoom = _applicationSettings.zoom - ZOOM_STEP
    if (zoom < minZoom) {
        zoom = minZoom
    }
    setZoom(zoom)
}

function resetZoom() {
    setZoom(_applicationSettings.ZOOM_DEFAULT)
}

function changeTheme(theme) {
    _applicationSettings.theme = theme
    _mainMenu.getMenuItemById(
        {
            system: "system-theme",
            light: "light-theme",
            dark: "dark-theme",
        }[theme]
    ).checked = true
}

function createWindow() {
    const windowPosition = loadDocumentSettings().windowPosition

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
    mainWindow.on("close", () => {
        const documentSettings = loadDocumentSettings()
        documentSettings.windowPosition = mainWindow.getBounds()
    })
    mainWindow.on("closed", () => (_mainWindow = null))
    mainWindow.webContents.on("did-finish-load", () => {
        if (_isReloading) {
            restorePosition()
            _isReloading = false
        }
    })
    mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.type === "keyDown") {
            if (input.key === "Backspace") {
                event.preventDefault()
                navigation.back()
            } else if (input.control && input.key === "+") {
                // Workaround for behavior that seems like https://github.com/electron/electron/issues/6731
                event.preventDefault()
                zoomIn()
            }
        }
    })

    remote.initialize()
    remote.enable(mainWindow.webContents)

    mainWindow.loadFile(path.join(__dirname, "index.html"))

    electron.nativeTheme.themeSource = _applicationSettings.theme

    const mainMenu = electron.Menu.buildFromTemplate([
        {
            label: "&File",
            submenu: [
                {
                    label: "&Open",
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
                    label: "&Print",
                    accelerator: "Ctrl+P",
                    click() {
                        mainWindow.webContents.print()
                    },
                },
                { type: "separator" },
                {
                    label: "&Quit",
                    accelerator: "Esc",
                    click() {
                        mainWindow.close()
                    },
                },
            ],
        },
        {
            label: "&Edit",
            submenu: [{ role: "copy" }],
        },
        {
            label: "&View",
            submenu: [
                {
                    label: "&Back",
                    accelerator: "Alt+Left",
                    id: navigation.BACK_MENU_ID,
                    click() {
                        navigation.back()
                    },
                },
                {
                    label: "&Forward",
                    accelerator: "Alt+Right",
                    id: navigation.FORWARD_MENU_ID,
                    click() {
                        navigation.forward()
                    },
                },
                { type: "separator" },
                {
                    label: "&Refresh",
                    accelerator: "F5",
                    click() {
                        reload(false)
                    },
                },
                {
                    label: "&Unblock All External Content",
                    accelerator: "Alt+U",
                    id: contentBlocking.UNBLOCK_CONTENT_MENU_ID,
                    click() {
                        contentBlocking.unblockAll()
                    },
                },
                {
                    label: "&View Raw Text",
                    accelerator: "Ctrl+U",
                    id: rawText.VIEW_RAW_TEXT_MENU_ID,
                    click() {
                        rawText.switchRawView()
                    },
                },
                { type: "separator" },
                {
                    label: "&Zoom",
                    submenu: [
                        {
                            label: "Zoom &In",
                            accelerator: "CmdOrCtrl+Plus",
                            click() {
                                zoomIn()
                            },
                        },
                        {
                            label: "Zoom &Out",
                            accelerator: "CmdOrCtrl+-",
                            click() {
                                zoomOut()
                            },
                        },
                        { type: "separator" },
                        {
                            label: "&Reset Zoom",
                            accelerator: "CmdOrCtrl+0",
                            click() {
                                resetZoom()
                            },
                        },
                    ],
                },
                {
                    label: "Theme",
                    submenu: [
                        {
                            label: "System Default",
                            type: "radio",
                            id: "system-theme",
                            click() {
                                changeTheme(_applicationSettings.SYSTEM_THEME)
                            },
                        },
                        {
                            label: "Light",
                            type: "radio",
                            id: "light-theme",
                            click() {
                                changeTheme(_applicationSettings.LIGHT_THEME)
                            },
                        },
                        {
                            label: "Dark",
                            type: "radio",
                            id: "dark-theme",
                            click() {
                                changeTheme(_applicationSettings.DARK_THEME)
                            },
                        },
                    ],
                },
                {
                    label: "Markdown rendering",
                    submenu: [
                        {
                            label: "Respect single line breaks",
                            type: "checkbox",
                            id: documentRendering.ENABLE_LINE_BREAKS_MENU_ID,
                            click() {
                                documentRendering.switchEnableLineBreaks()
                            },
                        },
                        {
                            label: "Enable typographic replacements",
                            type: "checkbox",
                            id: documentRendering.ENABLE_TYPOGRAPHY_MENU_ID,
                            click() {
                                documentRendering.switchEnableTypography()
                            },
                        },
                        {
                            label: "Convert Emoticons to Emojis",
                            type: "checkbox",
                            id: documentRendering.ENABLE_EMOJIS_MENU_ID,
                            click() {
                                documentRendering.switchEnableEmojis()
                            },
                        },
                    ],
                },
            ],
        },
        {
            label: "En&coding",
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
            label: "&Tools",
            submenu: [
                {
                    label: "&Developer Tools",
                    accelerator: "F10",
                    click() {
                        mainWindow.webContents.openDevTools()
                    },
                },
                {
                    label: "De&bug",
                    submenu: [
                        {
                            label: "Throw &exception",
                            click() {
                                throw new Error("An exception")
                            },
                        },
                    ],
                },
            ],
        },
        {
            label: "&Help",
            submenu: [
                {
                    label: "&About",
                    click() {
                        showAboutDialog(mainWindow)
                    },
                },
            ],
        },
    ])
    electron.Menu.setApplicationMenu(mainMenu)

    return [mainWindow, mainMenu]
}

electron.app.on("ready", () => {
    cli.init()
    _cliArgs = cli.parse(process.argv)

    log.init(_cliArgs.isTest)
    storage.init(_cliArgs.storageDir)
    _applicationSettings = storage.loadApplicationSettings(
        storage.dataDir,
        storage.APPLICATION_SETTINGS_FILE
    )

    const [mainWindow, mainMenu] = createWindow()
    _mainWindow = mainWindow
    _mainMenu = mainMenu

    changeTheme(_applicationSettings.theme)

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
    documentRendering.init(_mainWindow, _mainMenu, _applicationSettings)
    setZoom(_applicationSettings.zoom)

    const filePath = _cliArgs.filePath
    openFile(filePath, _cliArgs.internalTarget, encodingLib.load(filePath))
})

electron.ipcMain.on(ipc.messages.reloadPrepared, (_, isFileModification, encoding, position) => {
    _scrollPosition = position
    _isReloading = true

    const currentLocation = navigation.getCurrentLocation()
    const filePath = currentLocation.filePath
    if (isFileModification || !encoding) {
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
    log.error(`Unhandled error: ${error.stack}`)
    if (!_isTest && !process.argv[0].includes("electron")) {
        electron.dialog.showMessageBoxSync({
            type: "error",
            title: "Unhandled error (fault of Markdown Viewer)",
            message: error.stack,
        })
    }
    electron.app.exit(1)
})

setInterval(() => {
    if (!navigation.hasCurrentLocation()) {
        return
    }
    const filePath = navigation.getCurrentLocation().filePath
    fs.stat(filePath, (err, stats) => {
        if (err) {
            log.error(`Updating file "${filePath}" was aborted with error ${err}`)
            return
        }
        let mtime = stats.mtimeMs
        if (_lastModificationTime && mtime !== _lastModificationTime) {
            log.debug("Reloading...")
            _lastModificationTime = mtime
            reload(true)
        }
    })
}, UPDATE_INTERVAL)

navigation.register(UPDATE_FILE_TIME_NAV_ID, lastModificationTime => {
    const time = _lastModificationTime
    _lastModificationTime = lastModificationTime
    return time
})
