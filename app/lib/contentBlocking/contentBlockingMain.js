const common = require("../common")
const ipc = require("../ipc")
const navigation = require("../navigation/navigationMain")

const UNBLOCK_CONTENT_MENU_ID = "unblock-content"
const CONTENT_BLOCKING_NAV_ID = "content-blocking"

let _mainWindow
let _mainMenu

let _contentIsBlocked = false
let _unblockedURLs = []

function unblockURL(url) {
    if (!url) {
        throw new Error("No url given")
    }
    console.log(`Unblocked: ${url}`)
    _unblockedURLs.push(url)
}

function allowUnblockContent(isAllowed) {
    _mainMenu.getMenuItemById(UNBLOCK_CONTENT_MENU_ID).enabled = isAllowed
}

exports.UNBLOCK_CONTENT_MENU_ID = UNBLOCK_CONTENT_MENU_ID

exports.unblockedURLs = _unblockedURLs

exports.init = (mainWindow, mainMenu, electronMock) => {
    const electron = electronMock ?? require("electron")
    _mainWindow = mainWindow
    _mainMenu = mainMenu

    let lastTime = Date.now()

    const webRequest = electron.session.defaultSession.webRequest
    webRequest.onBeforeRequest((details, callback) => {
        const currentTime = Date.now()

        const url = details.url
        const isBlocked = common.isWebURL(url) && !_unblockedURLs.includes(url)
        console.log(
            `${isBlocked ? "Blocked" : "Loading"}: ${url} (${
                currentTime - lastTime
            } ms since last load)`
        )
        callback({ cancel: isBlocked })
        if (isBlocked) {
            _contentIsBlocked = true
            _mainWindow.webContents.send(ipc.messages.contentBlocked, url)
        }
        allowUnblockContent(_contentIsBlocked)

        lastTime = currentTime
    })
    webRequest.onBeforeRedirect(details => {
        const url = details.redirectURL
        console.log("Redirecting: " + url)
        unblockURL(url)
    })

    electron.ipcMain.on(ipc.messages.unblockURL, (_, url) => unblockURL(url))

    electron.ipcMain.on(ipc.messages.allContentUnblocked, () => {
        _contentIsBlocked = false
        allowUnblockContent(false)
    })

    navigation.register(CONTENT_BLOCKING_NAV_ID, info => {
        const contentIsBlocked = _contentIsBlocked
        const unblockedURLs = _unblockedURLs

        _contentIsBlocked = info?.contentIsBlocked ?? false
        _unblockedURLs = info?.unblockedURLs ?? []

        _mainWindow.webContents.send(ipc.messages.resetContentBlocking)

        return {
            contentIsBlocked: contentIsBlocked,
            unblockedURLs: unblockedURLs,
        }
    })
}

exports.unblockAll = () => _mainWindow.webContents.send(ipc.messages.unblockAll)

exports.clearUnblockedURLs = () => (_unblockedURLs.length = 0)
