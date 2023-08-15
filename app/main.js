/* eslint-disable camelcase */
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
const error = require("./lib/error/errorMain")
const ipc = require("./lib/ipc/ipcMain")
const log = require("./lib/log/log")
const menu = require("./lib/main/menu")
const navigation = require("./lib/navigation/navigationMain")
const rawText = require("./lib/rawText/rawTextMain")
const search = require("./lib/search/searchMain")
const settings = require("./lib/settings/settingsMain")
const storage = require("./lib/main/storage")
const toc = require("./lib/toc/tocMain")

const MIN_WINDOW_WIDTH = 200 // Pixels
const MIN_WINDOW_HEIGHT = 50 // Pixels
const UPDATE_INTERVAL = 1000 // ms
const UPDATE_FILE_TIME_NAV_ID = "update-file-time"
const ZOOM_STEP = 0.1

let _cliArgs
let _finderFilePath

let _mainWindow
let _mainMenu

let _lastModificationTime

let _isReloading = false
let _scrollPosition = 0

let _applicationSettings

function isMacOS() {
    return process.platform === "darwin"
}

function showAboutDialog(parentWindow) {
    const POSITION_OFFSET = 20
    const parentPosition = parentWindow.getBounds()

    const aboutDialog = aboutWindow.default({
        adjust_window_size: true,
        copyright: "Copyright © Christian Dreier",
        icon_path: path.join(
            __dirname,
            "assets",
            "icon",
            isMacOS() ? "md-mac-icon.svg" : "md-icon.svg",
        ),
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
        error.show(`Unknown file: "${filePath}"`)
    } else if (!fs.lstatSync(filePath).isFile()) {
        error.show("Given path does not lead to a file")
    } else {
        navigation.go(filePath, internalTarget, encoding)
        _lastModificationTime = fs.statSync(filePath).mtimeMs
    }
}

function loadDocumentSettings() {
    return storage.loadDocumentSettings(determineCurrentFilePath())
}

function determineCurrentFilePath() {
    return navigation.hasCurrentLocation()
        ? navigation.getCurrentLocation().filePath
        : _cliArgs.filePath ?? _finderFilePath
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
    ipc.send(
        ipc.messages.prepareReload,
        isFileModification,
        encoding ?? encodingLib.load(navigation.getCurrentLocation().filePath),
    )
}

function restoreScrollPosition() {
    ipc.send(ipc.messages.restorePosition, _scrollPosition)
}

function setZoom(zoomFactor) {
    _applicationSettings.zoom = zoomFactor
    ipc.send(ipc.messages.changeZoom, _applicationSettings.zoom)
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
    menu.setChecked(
        _mainMenu,
        {
            system: "system-theme",
            light: "light-theme",
            dark: "dark-theme",
        }[theme],
        true,
    )
}

function createMainMenu() {
    return electron.Menu.buildFromTemplate([
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
                            error.show(`Problem at opening file:\n ${e}`)
                        }
                    },
                },
                {
                    label: "&Print",
                    accelerator: "CmdOrCtrl+P",
                    click() {
                        // Workaround for Electron issue, see
                        // https://github.com/electron/electron/issues/36897
                        ipc.send(ipc.messages.print)
                    },
                },
                { type: "separator" },
                {
                    label: "&Quit",
                    click() {
                        _mainWindow?.close()
                    },
                },
            ],
        },
        {
            label: "&Edit",
            submenu: [
                { role: "copy" },
                { type: "separator" },
                {
                    label: "&Find...",
                    accelerator: "CmdOrCtrl+F",
                    id: search.FIND_MENU_ID,
                    click() {
                        search.start()
                    },
                },
                {
                    label: "Find &next",
                    accelerator: "F3",
                    id: search.FIND_NEXT_MENU_ID,
                    enabled: false,
                    click() {
                        search.next()
                    },
                },
                {
                    label: "Find &previous",
                    accelerator: "Shift+F3",
                    id: search.FIND_PREVIOUS_MENU_ID,
                    enabled: false,
                    click() {
                        search.previous()
                    },
                },
                { type: "separator" },
                {
                    label: "&Settings...",
                    accelerator: "CmdOrCtrl+,",
                    id: settings.SETTINGS_MENU_ID,
                    click() {
                        settings.open()
                    },
                },
            ],
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
                {
                    label: "Table Of &Content",
                    submenu: [
                        {
                            label: "Show For &All Documents",
                            accelerator: "Alt+Shift+C",
                            id: toc.SHOW_FOR_ALL_DOCS_MENU_ID,
                            type: "checkbox",
                            click() {
                                toc.switchVisibilityForApplication()
                            },
                        },
                        {
                            label: "Show For &This Document",
                            accelerator: "Alt+C",
                            id: toc.SHOW_FOR_THIS_DOC_MENU_ID,
                            type: "checkbox",
                            click() {
                                toc.switchVisibilityForDocument()
                            },
                        },
                        { type: "separator" },
                        {
                            label: "Forget Document Override",
                            id: toc.FORGET_DOCUMENT_OVERRIDE_MENU_ID,
                            click() {
                                toc.forgetDocumentOverride()
                            },
                        },
                    ],
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
                    label: "&Theme",
                    submenu: [
                        {
                            label: "&System Default",
                            type: "radio",
                            id: "system-theme",
                            click() {
                                changeTheme(_applicationSettings.SYSTEM_THEME)
                            },
                        },
                        {
                            label: "&Light",
                            type: "radio",
                            id: "light-theme",
                            click() {
                                changeTheme(_applicationSettings.LIGHT_THEME)
                            },
                        },
                        {
                            label: "&Dark",
                            type: "radio",
                            id: "dark-theme",
                            click() {
                                changeTheme(_applicationSettings.DARK_THEME)
                            },
                        },
                    ],
                },
                { type: "separator" },
                {
                    label: "Markdown Render &Options",
                    submenu: [
                        {
                            label: "Respect Single &Line Breaks",
                            type: "checkbox",
                            id: documentRendering.ENABLE_LINE_BREAKS_MENU_ID,
                            click() {
                                documentRendering.switchEnableLineBreaks()
                            },
                        },
                        {
                            label: "Enable &Typographic Replacements",
                            type: "checkbox",
                            id: documentRendering.ENABLE_TYPOGRAPHY_MENU_ID,
                            click() {
                                documentRendering.switchEnableTypography()
                            },
                        },
                        {
                            label: "Convert &Emoticons To Emojis",
                            type: "checkbox",
                            id: documentRendering.ENABLE_EMOJIS_MENU_ID,
                            click() {
                                documentRendering.switchEnableEmojis()
                            },
                        },
                        {
                            label: "Hide &Metadata Header",
                            type: "checkbox",
                            id: documentRendering.HIDE_METADATA_MENU_ID,
                            click() {
                                documentRendering.hideMetadata()
                            },
                        },
                    ],
                },
                { type: "separator" },
                {
                    label: "Render this file as Markdown",
                    type: "checkbox",
                    id: documentRendering.RENDER_FILE_AS_MD_MENU_ID,
                    click() {
                        documentRendering.switchRenderFileAsMarkdown(determineCurrentFilePath())
                    },
                },
                {
                    label: "Render all files of this type as Markdown",
                    type: "checkbox",
                    id: documentRendering.RENDER_FILE_TYPE_AS_MD_MENU_ID,
                    click() {
                        documentRendering.switchRenderFileTypeAsMarkdown(determineCurrentFilePath())
                    },
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
                        _mainWindow.webContents.openDevTools()
                    },
                },
                {
                    label: "De&bug",
                    submenu: [
                        {
                            label: "Throw e&xception",
                            click() {
                                throw new Error("An exception")
                            },
                        },
                        {
                            label: "Show &error dialog",
                            id: error.SHOW_ERROR_MENU_ID,
                            click() {
                                ipc.send(ipc.messages.showErrorDialog, "An error")
                            },
                        },
                        {
                            label: "Soft &reload",
                            click() {
                                navigation.reloadCurrent()
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
                        showAboutDialog(_mainWindow)
                    },
                },
            ],
        },
    ])
}

function createWindow() {
    const windowPosition = loadDocumentSettings().windowPosition
    const mainWindow = new electron.BrowserWindow({
        x: windowPosition.x,
        y: windowPosition.y,
        width: windowPosition.width,
        height: windowPosition.height,
        minWidth: MIN_WINDOW_WIDTH,
        minHeight: MIN_WINDOW_HEIGHT,
        backgroundColor: "#fff",
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    })
    mainWindow.on("close", () => (loadDocumentSettings().windowPosition = mainWindow.getBounds()))
    mainWindow.on("closed", () => (_mainWindow = null))
    mainWindow.webContents.on("did-finish-load", () => {
        if (_isReloading) {
            restoreScrollPosition()
            _isReloading = false
        }
    })
    mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.type === "keyDown") {
            if (input.control && input.key === "+") {
                // Workaround for behavior that seems like https://github.com/electron/electron/issues/6731
                event.preventDefault()
                zoomIn()
            } else if (isMacOS() && input.meta && input.key === "q") {
                electron.app.quit()
            }
        }
    })
    remote.enable(mainWindow.webContents)
    mainWindow.loadFile(path.join(__dirname, "index.html"))
    return mainWindow
}

function ensureWindowExists() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (electron.BrowserWindow.getAllWindows().length === 0) {
        _mainWindow = createWindow()
        ipc.reset(_mainWindow)
    }
}

electron.app.whenReady().then(() => {
    cli.init()
    _cliArgs = cli.parse(process.argv)

    log.init(_cliArgs.isTest)
    error.init(process)
    storage.init(_cliArgs.storageDir)
    _applicationSettings = storage.loadApplicationSettings()

    remote.initialize()
    electron.nativeTheme.themeSource = _applicationSettings.theme

    _mainMenu = createMainMenu()
    electron.Menu.setApplicationMenu(_mainMenu)

    _mainWindow = createWindow()

    changeTheme(_applicationSettings.theme)

    ipc.init(_mainWindow)
    navigation.init(_mainMenu)
    encodingLib.init(_mainMenu)
    contentBlocking.init(_mainMenu)
    rawText.init(_mainMenu)
    settings.init(_mainMenu)
    search.init(_mainMenu)

    electron.app.on("activate", ensureWindowExists)
})

electron.app.on("window-all-closed", () => {
    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    if (!isMacOS()) {
        electron.app.quit()
    }
})

// Mac specific event handler
electron.app.on("open-file", (event, path) => {
    event.preventDefault()
    if (navigation.isInitialized()) {
        ensureWindowExists()
        navigation.go(path)
    } else {
        _finderFilePath = path
    }
})

ipc.listen(ipc.messages.finishLoad, () => {
    documentRendering.init(_mainMenu, _applicationSettings, determineCurrentFilePath())
    setZoom(_applicationSettings.zoom)

    const filePath = _finderFilePath ?? _cliArgs.filePath
    openFile(filePath, _cliArgs.internalTarget, encodingLib.load(filePath))

    if (_finderFilePath) {
        _mainWindow.setBounds(loadDocumentSettings().windowPosition)
    }

    toc.init(_mainMenu, _applicationSettings)
})

ipc.listen(ipc.messages.reloadPrepared, (isFileModification, encoding, position) => {
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

    toc.update()
    restoreScrollPosition()
})

ipc.listen(ipc.messages.openFileInNewWindow, createChildWindow)

ipc.listen(ipc.messages.openInternalInNewWindow, target =>
    createChildWindow(navigation.getCurrentLocation().filePath, target),
)

ipc.listen(ipc.messages.closeApplication, () => _mainWindow?.close())

// Based on https://stackoverflow.com/a/50703424/13949398 (custom error window/handling in Electron)
process.on("uncaughtException", error => {
    log.error(`Unhandled error: ${error.stack}`)
    if (!process.argv[0].includes("electron")) {
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
        const mtime = stats.mtimeMs
        if (_lastModificationTime && mtime !== _lastModificationTime) {
            log.debug("Reloading...")
            _lastModificationTime = mtime
            reload(true)
        }
    })
}, UPDATE_INTERVAL)

navigation.register(UPDATE_FILE_TIME_NAV_ID, lastModificationTime => {
    const time = _lastModificationTime
    _lastModificationTime =
        lastModificationTime ?? fs.statSync(navigation.getCurrentLocation().filePath)
    return time
})

// Initialization before Electron's

const args = process.argv
if (cli.isDevelopment()) {
    electron.app.setPath(
        "userData",
        path.join(path.resolve(args.slice(1).find(arg => !arg.startsWith("-"))), ".data"),
    )
} else if (process.platform === "win32") {
    const startExePath = path.resolve(args[0])
    if (!startExePath.startsWith(path.resolve(process.env.PROGRAMFILES))) {
        electron.app.setPath("userData", path.join(path.dirname(startExePath), ".data"))
    }
}
