const electron = require("electron")

const ipc = require("../ipc")

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
    _mainMenu.getMenuItemById("view-raw-text").enabled = false
})

exports.init = (mainWindow, mainMenu) => {
    _mainWindow = mainWindow
    _mainMenu = mainMenu
}

exports.switchRawView = () => enterRawTextView(!_isInRawView)
