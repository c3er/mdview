"use strict"

const fs = require("fs")
const path = require("path")

const childProcess = require("child_process")
const electron = require("electron")
const remote = require("@electron/remote/main")

const about = require("./lib/aboutMain")
const cli = require("./lib/cliMain")
const common = require("./lib/common")
const contentBlocking = require("./lib/contentBlockingMain")
const encodingLib = require("./lib/encodingMain")
const error = require("./lib/errorMain")
const fileHistory = require("./lib/fileHistoryMain")
const ipc = require("./lib/ipcMain")
const log = require("./lib/log")
const menu = require("./lib/menuMain")
const navigation = require("./lib/navigationMain")
const rawText = require("./lib/rawTextMain")
const search = require("./lib/searchMain")
const settings = require("./lib/settingsMain")
const storage = require("./lib/storageMain")
const toc = require("./lib/tocMain")
const zoom = require("./lib/zoomMain")

const MIN_WINDOW_WIDTH = 200 // Pixels
const MIN_WINDOW_HEIGHT = 50 // Pixels
const UPDATE_INTERVAL = 1000 // ms
const UPDATE_FILE_TIME_NAV_ID = "update-file-time"

let _cliArgs
let _finderFilePath

let _mainWindow
let _mainMenu

let _lastModificationTime

let _isReloading = false
let _scrollPosition = 0

let _applicationSettings

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
        ? navigation.currentFilePath()
        : (_cliArgs.filePath ?? _finderFilePath)
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
        encoding ?? encodingLib.load(navigation.currentFilePath()),
    )
}

function restoreScrollPosition() {
    ipc.send(ipc.messages.restorePosition, _scrollPosition)
}

function createMainMenu() {
    const aboutEntry = {
        label: "&About",
        id: about.ABOUT_DIALOG_MENU_ID,
        click() {
            about.open()
        },
    }
    const settingsEntry = {
        label: "&Settings...",
        accelerator: "CmdOrCtrl+,",
        id: settings.SETTINGS_MENU_ID,
        click() {
            settings.open()
        },
    }
    return electron.Menu.buildFromTemplate([
        ...(common.isMacOS()
            ? [
                  {
                      label: electron.app.name,
                      submenu: [
                          aboutEntry,
                          { type: "separator" },
                          settingsEntry,
                          { role: "services" },
                          { type: "separator" },
                          { role: "hide" },
                          { role: "hideOthers" },
                          { role: "unhide" },
                          { type: "separator" },
                          { type: "separator" },
                          { role: "quit" },
                      ],
                  },
              ]
            : []),
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
                    label: "Recent Files",
                    id: fileHistory.RECENT_FILES_MENU_ID,
                    submenu: [],
                },
                {
                    label: "Clear Recent Files List",
                    id: fileHistory.REMOVE_RECENT_FILES_MENU_ID,
                    enabled: false,
                    click() {
                        fileHistory.clear()
                    },
                },
                ...(!common.isMacOS()
                    ? [
                          { type: "separator" },
                          {
                              label: "&Quit",
                              click() {
                                  _mainWindow?.close()
                              },
                          },
                      ]
                    : []),
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
                    id: "refresh",
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
                                toc.setVisibilityForApplication(
                                    menu.getChecked(_mainMenu, toc.SHOW_FOR_ALL_DOCS_MENU_ID),
                                )
                            },
                        },
                        {
                            label: "Show For &This Document",
                            accelerator: "Alt+C",
                            id: toc.SHOW_FOR_THIS_DOC_MENU_ID,
                            type: "checkbox",
                            click() {
                                toc.setVisibilityForDocument(
                                    menu.getChecked(_mainMenu, toc.SHOW_FOR_THIS_DOC_MENU_ID),
                                )
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
                                zoom.in()
                            },
                        },
                        {
                            label: "Zoom &Out",
                            accelerator: "CmdOrCtrl+-",
                            click() {
                                zoom.out()
                            },
                        },
                        { type: "separator" },
                        {
                            label: "&Reset Zoom",
                            accelerator: "CmdOrCtrl+0",
                            click() {
                                zoom.reset()
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
                    encodingLib.change(navigation.currentFilePath(), encoding)
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
        { role: "windowMenu" },
        ...(!common.isMacOS()
            ? [
                  {
                      label: "&Help",
                      submenu: [aboutEntry],
                  },
              ]
            : []),
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
        if (input.type !== "keyDown") {
            return
        }
        if (input.control) {
            switch (input.key) {
                case "+":
                    event.preventDefault()
                    zoom.in()
                    break
                case "-":
                    event.preventDefault()
                    zoom.out()
                    break
            }
        } else if (common.isMacOS() && input.meta && input.key === "q") {
            electron.app.quit()
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

    ipc.init(_mainWindow)
    navigation.init(_mainMenu)
    encodingLib.init(_mainMenu)
    contentBlocking.init(_mainMenu)
    rawText.init(_mainMenu)
    search.init(_mainMenu)
    fileHistory.init(_mainMenu, determineCurrentFilePath())
    about.init(_mainMenu)

    electron.app.on("activate", ensureWindowExists)

    log.debug("User data directory:", electron.app.getPath("userData"))
})

electron.app.on("window-all-closed", () => {
    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    if (!common.isMacOS()) {
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
    const filePath = determineCurrentFilePath()
    settings.init(_mainMenu, filePath)
    zoom.init()

    if (navigation.hasCurrentLocation()) {
        navigation.reloadCurrent(_scrollPosition)
    } else {
        openFile(filePath, _cliArgs.internalTarget, encodingLib.load(filePath))
    }

    if (_finderFilePath) {
        _mainWindow.setBounds(loadDocumentSettings().windowPosition)
    }

    toc.init(_mainMenu, _applicationSettings)
})

ipc.listen(ipc.messages.reloadPrepared, (isFileModification, encoding, position) => {
    _scrollPosition = position
    _isReloading = true

    if (isFileModification || !encoding) {
        navigation.reloadCurrent(position)
    } else {
        encodingLib.change(navigation.currentFilePath(), encoding)
        _mainWindow.reload()
    }

    toc.update()
    restoreScrollPosition()
})

ipc.listen(ipc.messages.openFileInNewWindow, createChildWindow)

ipc.listen(ipc.messages.openInternalInNewWindow, target =>
    createChildWindow(navigation.currentFilePath(), target),
)

ipc.listen(ipc.messages.closeApplication, () => _mainWindow?.close())

ipc.listen(ipc.messages.dragDropBehavior, behavior => {
    _applicationSettings.dragDropBehavior = behavior
    settings.notifySettingsChanges(navigation.currentFilePath())
})

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
    const filePath = navigation.currentFilePath()
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
    _lastModificationTime = lastModificationTime ?? fs.statSync(navigation.currentFilePath())
    return time
})

// Initialization before Electron's

const args = process.argv
const appDir = path.dirname(path.resolve(args[0]))

// Set user data directory
if (cli.isDevelopment()) {
    electron.app.setPath(
        "userData",
        path.join(path.resolve(args.slice(1).find(arg => !arg.startsWith("-"))), ".data"),
    )
} else if (
    process.platform === "win32" &&
    !appDir.startsWith(process.env.ProgramFiles) &&
    !appDir.startsWith(process.env.LOCALAPPDATA)
) {
    electron.app.setPath("userData", path.join(appDir, ".data"))
}

// If set, ouput only paths and exit
let shallExitApplication = false
if (cli.shallOutputAppPath(args)) {
    console.log(appDir)
    shallExitApplication = true
}
if (cli.shallOutputDataPath(args)) {
    console.log(electron.app.getPath("userData"))
    shallExitApplication = true
}
if (shallExitApplication) {
    process.exit(0)
}
