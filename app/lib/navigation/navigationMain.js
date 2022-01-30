const encodingLib = require("../encoding/encodingMain")
const ipc = require("../ipc")

let electron

const BACK_MENU_ID = "back"
const FORWARD_MENU_ID = "forward"

let _mainWindow
let _mainMenu

const _locations = {
    back: [],
    forward: [],
    current: null,
}

const _callbacks = {}

class Location {
    filePath
    internalTarget
    scrollPosition
    callbackInfo = {}

    constructor(filePath, internalTarget) {
        this.filePath = filePath
        this.internalTarget = internalTarget
    }

    setCallbackInfo(id, info) {
        this.callbackInfo[id] = info
    }

    getCallbackInfo(id) {
        return this.callbackInfo[id]
    }

    // For debugging
    toString() {
        let target = this.filePath
        let targetString = this.internalTarget ? `${target}${this.internalTarget}` : target
        if (this.scrollPosition) {
            targetString += ` (${this.scrollPosition})`
        }
        return targetString
    }
}

function allowBack(isAllowed) {
    _mainMenu.getMenuItemById(BACK_MENU_ID).enabled = isAllowed
}

function allowForward(isAllowed) {
    _mainMenu.getMenuItemById(FORWARD_MENU_ID).enabled = isAllowed
}

function clearBack() {
    _locations.back.length = 0
    allowBack(false)
}

function clearForward() {
    _locations.forward.length = 0
    allowForward(false)
}

function reset() {
    clearBack()
    clearForward()
    _locations.current = null
}

function canGoBack() {
    return _locations.back.length > 0
}

function canGoForward() {
    return _locations.forward.length > 0
}

function openFile(filePath, internalTarget, encoding, scrollPosition) {
    // log.debug(`Navigate to "${_locations.current}"`)
    _mainWindow.webContents.send(
        ipc.messages.fileOpen,
        filePath,
        internalTarget,
        encoding,
        scrollPosition
    )
}

function handleCallbacks(oldLocation, destination) {
    for (const [id, callback] of Object.entries(_callbacks)) {
        oldLocation?.setCallbackInfo(id, callback(destination.getCallbackInfo(id)))
    }
}

function goStep(canGoCallback, pushDirection, popDirection) {
    if (!canGoCallback()) {
        return
    }

    const oldLocation = _locations.current
    pushDirection.push(oldLocation)

    const destination = popDirection.pop()
    _locations.current = destination

    allowBack(canGoBack())
    allowForward(canGoForward())

    const filePath = destination.filePath
    openFile(
        filePath,
        destination.internalTarget,
        encodingLib.load(filePath),
        destination.scrollPosition
    )
    handleCallbacks(oldLocation, destination)
}

function go(filePath, internalTarget, encoding, lastScrollPosition) {
    const oldLocation = _locations.current
    if (oldLocation) {
        oldLocation.scrollPosition = lastScrollPosition
        _locations.back.push(oldLocation)
    }
    clearForward()
    const destination = (_locations.current = new Location(filePath, internalTarget))
    allowBack(canGoBack())

    if (encoding) {
        encodingLib.change(filePath, encoding)
    } else {
        encoding = encodingLib.load(filePath)
    }

    openFile(filePath, internalTarget, encoding, 0)
    handleCallbacks(oldLocation, destination)
}

exports.BACK_MENU_ID = BACK_MENU_ID

exports.FORWARD_MENU_ID = FORWARD_MENU_ID

exports.init = (mainWindow, mainMenu, electronMock, storageDir) => {
    electron = electronMock ?? require("electron")
    _mainWindow = mainWindow
    _mainMenu = mainMenu

    encodingLib.init(mainMenu, storageDir, electronMock)

    reset()

    electron.ipcMain.on(ipc.messages.openFile, (_, filePath, lastScrollPosition) =>
        go(filePath, null, null, lastScrollPosition)
    )

    electron.ipcMain.on(ipc.messages.openInternal, (_, target, lastScrollPosition) =>
        go(_locations.current.filePath, target, null, lastScrollPosition)
    )
}

exports.back = () => goStep(canGoBack, _locations.forward, _locations.back)

exports.forward = () => goStep(canGoForward, _locations.back, _locations.forward)

exports.go = go

exports.reloadCurrent = scrollPosition => {
    const currentLoaction = _locations.current
    const filePath = currentLoaction.filePath
    openFile(filePath, currentLoaction.internalTarget, encodingLib.load(filePath), scrollPosition)
}

exports.register = (id, callback) => (_callbacks[id] = callback)

exports.getCurrentLocation = () => _locations.current

exports.hasCurrentLocation = () => !!_locations.current

exports.canGoBack = canGoBack

exports.canGoForward = canGoForward
