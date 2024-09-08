const ipc = require("./ipcMain")
const menu = require("./menuMain")

const VIEW_RAW_TEXT_MENU_ID = "view-raw-text"

let _mainMenu

let _isInRawView = false

function enterRawTextView(shallEnterRawTextView) {
    if (_isInRawView !== shallEnterRawTextView) {
        _isInRawView = shallEnterRawTextView
        ipc.send(shallEnterRawTextView ? ipc.messages.viewRawText : ipc.messages.leaveRawText)
    }
}

exports.VIEW_RAW_TEXT_MENU_ID = VIEW_RAW_TEXT_MENU_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    _isInRawView = false

    ipc.listen(ipc.messages.disableRawView, () => {
        enterRawTextView(false)
        menu.setEnabled(_mainMenu, VIEW_RAW_TEXT_MENU_ID, false)
    })
    ipc.listen(ipc.messages.enableRawView, () => {
        enterRawTextView(_isInRawView)
        menu.setEnabled(_mainMenu, VIEW_RAW_TEXT_MENU_ID, true)
    })
}

exports.switchRawView = () => enterRawTextView(!_isInRawView)
