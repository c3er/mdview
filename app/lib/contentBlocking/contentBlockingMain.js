const electron = require("electron")

const common = require("../common")
const ipc = require("../ipc")

let _mainWindow
let _mainMenu

const UNBLOCK_CONTENT_MENU_ID = "unblock-content"

let _contentIsBlocked = false
const _unblockedURLs = []

function unblockURL(url) {
    console.log(`Unblocked: ${url}`)
    _unblockedURLs.push(url)
}

function allowUnblockContent(isAllowed) {
    _mainMenu.getMenuItemById(UNBLOCK_CONTENT_MENU_ID).enabled = isAllowed
}

electron.ipcMain.on(ipc.messages.unblockURL, (_, url) => unblockURL(url))

electron.ipcMain.on(ipc.messages.allContentUnblocked, () => {
    _contentIsBlocked = false
    allowUnblockContent(false)
})

exports.UNBLOCK_CONTENT_MENU_ID = UNBLOCK_CONTENT_MENU_ID

exports.init = (mainWindow, mainMenu) => {
    _mainWindow = mainWindow
    _mainMenu = mainMenu

    const webRequest = electron.session.defaultSession.webRequest
    webRequest.onBeforeRequest((details, callback) => {
        const url = details.url
        const isBlocked = common.isWebURL(url) && !_unblockedURLs.includes(url)
        console.log(`${isBlocked ? "Blocked" : "Loading"}: ${url}`)
        callback({ cancel: isBlocked })
        if (isBlocked) {
            _contentIsBlocked = true
            _mainWindow.webContents.send(ipc.messages.contentBlocked, url)
        }
        allowUnblockContent(_contentIsBlocked)
    })
    webRequest.onBeforeRedirect(details => {
        const url = details.redirectURL
        console.log("Redirecting: " + url)
        unblockURL(url)
    })
}

exports.toRenderer = {
    unblockAll() {
        _mainWindow.webContents.send(ipc.messages.unblockAll)
    },
}
