const common = require("./common")
const ipc = require("./ipcMain")
const log = require("./log")
const menu = require("./menuMain")
const navigation = require("./navigationMain")
const storage = require("./storageMain")

const UNBLOCK_CONTENT_TEMPORARY_MENU_ID = "unblock-content"
const UNBLOCK_CONTENT_PERMANENTLY_MENU_ID = "unblock-content-permanently"
const CONTENT_BLOCKING_NAV_ID = "content-blocking"

let _mainMenu

let _contentIsBlocked = false
let _allowedURLs = []
let _permanentlyAllowedURLs

function unblockURL(url, isPermanent) {
    if (!url) {
        throw new Error("No url given")
    }
    log.info(`Unblocked ${isPermanent ? "permanently" : "temporary"}: ${url}`)
    _allowedURLs.push(url)
    if (isPermanent) {
        _permanentlyAllowedURLs.add(url)
    }
}

function allowUnblockContent(isAllowed) {
    menu.setEnabled(_mainMenu, UNBLOCK_CONTENT_TEMPORARY_MENU_ID, isAllowed)
}

exports.UNBLOCK_CONTENT_TEMPORARY_MENU_ID = UNBLOCK_CONTENT_TEMPORARY_MENU_ID

exports.UNBLOCK_CONTENT_PERMANENTLY_MENU_ID = UNBLOCK_CONTENT_PERMANENTLY_MENU_ID

exports.unblockedURLs = _allowedURLs

exports.init = (mainMenu, electronMock) => {
    const electron = electronMock ?? require("electron")
    _mainMenu = mainMenu

    _permanentlyAllowedURLs = storage.loadAllowedUrls()
    _allowedURLs.push(..._permanentlyAllowedURLs.urls)

    let lastTime = Date.now()

    const webRequest = electron.session.defaultSession.webRequest
    webRequest.onBeforeRequest((details, callback) => {
        const currentTime = Date.now()

        const url = details.url
        const isBlocked = common.isWebURL(url) && !_allowedURLs.includes(url)
        log.info(
            `${isBlocked ? "Blocked" : "Loading"}: ${url} (${currentTime - lastTime} ms since last load)`,
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
        const unblockedURLs = _allowedURLs

        _contentIsBlocked = info?.contentIsBlocked ?? false
        _allowedURLs = info?.unblockedURLs ?? []

        ipc.send(ipc.messages.resetContentBlocking)

        return {
            contentIsBlocked: contentIsBlocked,
            unblockedURLs: unblockedURLs,
        }
    })
}

exports.unblockAll = () => ipc.send(ipc.messages.unblockAll)

exports.unblockAllPermamently = () => console.log("Unblock all content permanently")

exports.clearUnblockedURLs = () => (_allowedURLs.length = 0)
