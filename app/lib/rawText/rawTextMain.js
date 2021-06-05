const electron = require("electron")

const ipc = require("../ipc")

const VIEW_RAW_TEXT_MENU_ID = "view-raw-text"

let _mainWindow
let _mainMenu

let _isInRawView = false

function enterRawTextView(shallEnterRawTextView) {
    _isInRawView = shallEnterRawTextView
    _mainWindow.webContents.send(
        shallEnterRawTextView ? ipc.messages.viewRawText : ipc.messages.leaveRawText
    )
}

electron.ipcMain.on(ipc.messages.disableRawView, () => {
    enterRawTextView(false)
    _mainMenu.getMenuItemById(VIEW_RAW_TEXT_MENU_ID).enabled = false
})

exports.VIEW_RAW_TEXT_MENU_ID = VIEW_RAW_TEXT_MENU_ID

exports.init = (mainWindow, mainMenu) => {
    _mainWindow = mainWindow
    _mainMenu = mainMenu
}

exports.switchRawView = () => enterRawTextView(!_isInRawView)
