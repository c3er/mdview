const common = require("./common")
const ipc = require("./ipcMain")
const log = require("./log")
const menu = require("./menuMain")
const navigation = require("./navigationMain")
const storage = require("./storageMain")

const UNBLOCK_CONTENT_TEMPORARY_MENU_ID = "unblock-content"
const UNBLOCK_CONTENT_PERMANENTLY_MENU_ID = "unblock-content-permanently"
const MANAGE_CONTENT_BLOCKING_MENU_ID = "manage-content-blocking"
const CONTENT_BLOCKING_NAV_ID = "content-blocking"

let _mainMenu

let _contentIsBlocked = false
let _allowedURLs = []
let _blockingStorage

function unblockUrl(url) {
    if (!url) {
        throw new Error("No url given to unblock")
    }
    log.info(`Unblocked: ${url}`)
    _allowedURLs.push(url)
}

function canManageContentBlocking() {
    return _contentIsBlocked || !_blockingStorage.isEmpty
}

function allowManageContentBlocking(isAllowed) {
    menu.setEnabled(_mainMenu, MANAGE_CONTENT_BLOCKING_MENU_ID, isAllowed)
}

function allowUnblockContent(isAllowed) {
    menu.setEnabled(_mainMenu, UNBLOCK_CONTENT_TEMPORARY_MENU_ID, isAllowed)
    menu.setEnabled(_mainMenu, UNBLOCK_CONTENT_PERMANENTLY_MENU_ID, isAllowed)
}

function update() {
    ipc.send(ipc.messages.updateBlockedContents, _blockingStorage.toObject())
}

exports.UNBLOCK_CONTENT_TEMPORARY_MENU_ID = UNBLOCK_CONTENT_TEMPORARY_MENU_ID

exports.UNBLOCK_CONTENT_PERMANENTLY_MENU_ID = UNBLOCK_CONTENT_PERMANENTLY_MENU_ID

exports.MANAGE_CONTENT_BLOCKING_MENU_ID = MANAGE_CONTENT_BLOCKING_MENU_ID

exports.unblockedURLs = _allowedURLs

exports.init = (mainMenu, electronMock) => {
    const electron = electronMock ?? require("electron")
    _mainMenu = mainMenu

    _blockingStorage = storage.loadContentBlocking()
    _allowedURLs.push(
        ..._blockingStorage.contents
            .filter(content => !content.isBlocked)
            .map(content => content.url),
    )

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
        allowManageContentBlocking(canManageContentBlocking())

        lastTime = currentTime
    })
    webRequest.onBeforeRedirect(details => {
        const url = details.redirectURL
        log.info(`Redirecting: ${url}`)
        unblockUrl(url)
    })

    ipc.listen(ipc.messages.unblock, (url, isBlocked) => {
        if (!isBlocked) {
            unblockUrl(url)
        }
    })
    ipc.listen(ipc.messages.storeUrl, (url, isBlocked, originDocuments) => {
        if (!url) {
            throw new Error("No url given to store")
        }
        log.info(`Stored ${isBlocked ? "blocked" : "unblocked"} URL: ${url}`)
        _blockingStorage.save(url, isBlocked, originDocuments)
    })
    ipc.listen(ipc.messages.allContentUnblocked, () => {
        _contentIsBlocked = false
        allowUnblockContent(false)
    })
    ipc.listen(ipc.messages.updateBlockedContentsRequest, update)
    ipc.listen(ipc.messages.unblockDialogIsOpen, isOpen =>
        menu.setEnabled(_mainMenu, UNBLOCK_CONTENT_PERMANENTLY_MENU_ID, !isOpen),
    )
    ipc.listen(ipc.messages.contentManagementDialogIsOpen, isOpen =>
        menu.setEnabled(_mainMenu, MANAGE_CONTENT_BLOCKING_MENU_ID, !isOpen),
    )

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

exports.unblockAllPermamently = update

exports.manageUnblocked = () =>
    ipc.send(ipc.messages.manageContentBlocking, _blockingStorage.toObject())

exports.clearUnblockedURLs = () => (_allowedURLs.length = 0)
