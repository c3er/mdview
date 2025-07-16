const encodingLib = require("./encodingMain")
const ipc = require("./ipcMain")
const menu = require("./menuMain")

const BACK_MENU_ID = "back"
const FORWARD_MENU_ID = "forward"

let _isInitialized = false
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
        const target = this.filePath
        let targetString = this.internalTarget ? `${target}${this.internalTarget}` : target
        if (this.scrollPosition) {
            targetString += ` (${this.scrollPosition})`
        }
        return targetString
    }
}

function allowBack(isAllowed) {
    menu.setEnabled(_mainMenu, BACK_MENU_ID, isAllowed)
}

function allowForward(isAllowed) {
    menu.setEnabled(_mainMenu, FORWARD_MENU_ID, isAllowed)
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

function openFile(file) {
    ipc.send(ipc.messages.fileOpen, file)
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
    openFile({
        path: filePath,
        internalTarget: destination.internalTarget,
        encoding: encodingLib.load(filePath),
        scrollPosition: destination.scrollPosition,
    })
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

    openFile({
        path: filePath,
        internalTarget: internalTarget,
        encoding: encoding,
        scrollPosition: 0,
    })
    handleCallbacks(oldLocation, destination)
}

function back() {
    goStep(canGoBack, _locations.forward, _locations.back)
}

exports.BACK_MENU_ID = BACK_MENU_ID

exports.FORWARD_MENU_ID = FORWARD_MENU_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    encodingLib.init(mainMenu)
    reset()

    ipc.listen(ipc.messages.openFile, (filePath, lastScrollPosition) =>
        go(filePath, null, null, lastScrollPosition),
    )
    ipc.listen(ipc.messages.openInternal, (target, lastScrollPosition) =>
        go(_locations.current.filePath, target, null, lastScrollPosition),
    )
    ipc.listen(ipc.messages.navigateBack, back)

    _isInitialized = true
}

exports.back = back

exports.forward = () => goStep(canGoForward, _locations.back, _locations.forward)

exports.go = go

exports.reloadCurrent = scrollPosition => {
    const currentLoaction = _locations.current
    const filePath = currentLoaction.filePath
    openFile({
        path: filePath,
        internalTarget: currentLoaction.internalTarget,
        encoding: encodingLib.load(filePath),
        scrollPosition: scrollPosition,
    })
}

exports.register = (id, callback) => (_callbacks[id] = callback)

exports.currentFilePath = () => _locations.current.filePath

exports.hasCurrentLocation = () => Boolean(_locations.current)

exports.canGoBack = canGoBack

exports.canGoForward = canGoForward

exports.isInitialized = () => _isInitialized
