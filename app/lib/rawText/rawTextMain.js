const ipc = require("../ipc/ipcMain")

const VIEW_RAW_TEXT_MENU_ID = "view-raw-text"

let _mainMenu

let _isInRawView

function enterRawTextView(shallEnterRawTextView) {
    _isInRawView = shallEnterRawTextView
    ipc.send(shallEnterRawTextView ? ipc.messages.viewRawText : ipc.messages.leaveRawText)
}

exports.VIEW_RAW_TEXT_MENU_ID = VIEW_RAW_TEXT_MENU_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    _isInRawView = false

    ipc.listen(ipc.messages.disableRawView, () => {
        enterRawTextView(false)
        _mainMenu.getMenuItemById(VIEW_RAW_TEXT_MENU_ID).enabled = false
    })
    ipc.listen(ipc.messages.enableRawView, () => {
        enterRawTextView(false)
        _mainMenu.getMenuItemById(VIEW_RAW_TEXT_MENU_ID).enabled = true
    })
}

exports.switchRawView = () => enterRawTextView(!_isInRawView)
