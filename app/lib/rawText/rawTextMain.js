const ipc = require("../ipc")

const VIEW_RAW_TEXT_MENU_ID = "view-raw-text"

let _mainWindow
let _mainMenu

let _isInRawView

function enterRawTextView(shallEnterRawTextView) {
    _isInRawView = shallEnterRawTextView
    _mainWindow.webContents.send(
        shallEnterRawTextView ? ipc.messages.viewRawText : ipc.messages.leaveRawText
    )
}

exports.VIEW_RAW_TEXT_MENU_ID = VIEW_RAW_TEXT_MENU_ID

exports.init = (mainWindow, mainMenu, electronMock) => {
    const electron = electronMock ?? require("electron")
    _mainWindow = mainWindow
    _mainMenu = mainMenu

    _isInRawView = false

    electron.ipcMain.on(ipc.messages.disableRawView, () => {
        enterRawTextView(false)
        _mainMenu.getMenuItemById(VIEW_RAW_TEXT_MENU_ID).enabled = false
    })
}

exports.switchRawView = () => enterRawTextView(!_isInRawView)
