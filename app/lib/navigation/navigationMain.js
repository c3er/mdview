const encodingLib = require("../main/encoding")
const ipc = require("../ipc")

let electron

const BACK_MENU_ID = "back"
const FORWARD_MENU_ID = "forward"

let _mainWindow
let _mainMenu

const _locations = {
    forward: [],
    back: [],
    current: null,
}

class Location {
    filePath
    internalTarget

    constructor(filePath, internalTarget) {
        this.filePath = filePath
        this.internalTarget = internalTarget
    }

    // For debugging
    toString() {
        let target = this.filePath
        return this.internalTarget ? `${target}${this.internalTarget}` : target
    }
}

function allowBack(isAllowed) {
    _mainMenu.getMenuItemById(BACK_MENU_ID).enabled = isAllowed
}

function allowForward(isAllowed) {
    _mainMenu.getMenuItemById(FORWARD_MENU_ID).enabled = isAllowed
}

function clearForward() {
    _locations.forward.length = 0
    allowForward(false)
}

function canGoBack() {
    return _locations.back.length > 0
}

function canGoForward() {
    return _locations.forward.length > 0
}

function openFile(filePath, internalTarget, encoding) {
    console.debug(`Navigate to "${_locations.current}"`)
    _mainWindow.webContents.send(ipc.messages.fileOpen, filePath, internalTarget, encoding)
}

function goStep(canGoCallback, pushDirection, popDirection) {
    if (!canGoCallback()) {
        return
    }

    pushDirection.push(_locations.current)

    const destination = popDirection.pop()
    _locations.current = destination

    allowBack(canGoBack())
    allowForward(canGoForward())

    const filePath = destination.filePath
    openFile(filePath, destination.internalTarget, encodingLib.load(filePath))
}

function go(filePath, internalTarget, encoding) {
    const currentLocation = _locations.current
    if (currentLocation) {
        _locations.back.push(currentLocation)
    }
    clearForward()
    _locations.current = new Location(filePath, internalTarget)
    allowBack(canGoBack())

    if (encoding) {
        encodingLib.change(filePath, encoding)
    } else {
        encoding = encodingLib.load(filePath)
    }

    openFile(filePath, internalTarget, encoding)
}

exports.BACK_MENU_ID = BACK_MENU_ID

exports.FORWARD_MENU_ID = FORWARD_MENU_ID

exports.init = (mainWindow, mainMenu, electronMock) => {
    electron = electronMock ?? require("electron")
    _mainWindow = mainWindow
    _mainMenu = mainMenu

    allowBack(false)
    allowForward(false)

    electron.ipcMain.on(ipc.messages.openFile, (_, filePath) => go(filePath))

    electron.ipcMain.on(ipc.messages.openInternal, (_, target) =>
        go(_locations.current.filePath, target)
    )
}

exports.back = () => goStep(canGoBack, _locations.forward, _locations.back)

exports.forward = () => goStep(canGoForward, _locations.back, _locations.forward)

exports.go = go
