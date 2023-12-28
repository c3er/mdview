const common = require("./common")
const ipc = require("./ipcMain")
const log = require("./log")
const menu = require("./main/menu")
const navigation = require("./navigationMain")

const UNBLOCK_CONTENT_MENU_ID = "unblock-content"
const CONTENT_BLOCKING_NAV_ID = "content-blocking"

let _mainMenu

let _contentIsBlocked = false
let _unblockedURLs = []

function unblockURL(url) {
    if (!url) {
        throw new Error("No url given")
    }
    log.info(`Unblocked: ${url}`)
    _unblockedURLs.push(url)
}

function allowUnblockContent(isAllowed) {
    menu.setEnabled(_mainMenu, UNBLOCK_CONTENT_MENU_ID, isAllowed)
}

exports.UNBLOCK_CONTENT_MENU_ID = UNBLOCK_CONTENT_MENU_ID

exports.unblockedURLs = _unblockedURLs

exports.init = (mainMenu, electronMock) => {
    const electron = electronMock ?? require("electron")
    _mainMenu = mainMenu

    let lastTime = Date.now()

    const webRequest = electron.session.defaultSession.webRequest
    webRequest.onBeforeRequest((details, callback) => {
        const currentTime = Date.now()

        const url = details.url
        const isBlocked = common.isWebURL(url) && !_unblockedURLs.includes(url)
        log.info(
            `${isBlocked ? "Blocked" : "Loading"}: ${url} (${
                currentTime - lastTime
            } ms since last load)`,
        )
        callback({ cancel: isBlocked })
        if (isBlocked) {
            _contentIsBlocked = true
            ipc.send(ipc.messages.contentBlocked, url)
        }
        allowUnblockContent(_contentIsBlocked)

        lastTime = currentTime
    })
    webRequest.onBeforeRedirect(details => {
        const url = details.redirectURL
        log.info(`Redirecting: ${url}`)
        unblockURL(url)
    })

    ipc.listen(ipc.messages.unblockURL, unblockURL)
    ipc.listen(ipc.messages.allContentUnblocked, () => {
        _contentIsBlocked = false
        allowUnblockContent(false)
    })

    navigation.register(CONTENT_BLOCKING_NAV_ID, info => {
        const contentIsBlocked = _contentIsBlocked
        const unblockedURLs = _unblockedURLs

        _contentIsBlocked = info?.contentIsBlocked ?? false
        _unblockedURLs = info?.unblockedURLs ?? []

        ipc.send(ipc.messages.resetContentBlocking)

        return {
            contentIsBlocked: contentIsBlocked,
            unblockedURLs: unblockedURLs,
        }
    })
}

exports.unblockAll = () => ipc.send(ipc.messages.unblockAll)

exports.clearUnblockedURLs = () => (_unblockedURLs.length = 0)
