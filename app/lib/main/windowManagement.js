const path = require("path")

const electron = require("electron")
const remote = require("@electron/remote/main")

const navigation = require("../navigation/navigationMain")
const settings = require("./settings")

let _mainWindow
let _isReloading = false

function loadDocumentSettings() {
    return settings.loadDocumentSettings(navigation.determineCurrentFilePath())
}

function isReloading() {
    return _isReloading
}

function startReload() {
    _isReloading = true
}

function stopReload() {
    _isReloading = false
}

exports.createWindow = () => {
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
    mainWindow.on("close", () => (loadDocumentSettings().windowPosition = mainWindow.getBounds()))
    mainWindow.on("closed", () => (_mainWindow = null))
    mainWindow.webContents.on("did-finish-load", () => {
        if (isReloading()) {
            restoreScrollPosition()
            stopReload()
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
    remote.enable(mainWindow.webContents)
    mainWindow.loadFile(path.join(__dirname, "..", "..", "index.html"))
    return (_mainWindow = mainWindow)
}

exports.isReloading = isReloading

exports.startReload = startReload

exports.stopReload = stopReload
