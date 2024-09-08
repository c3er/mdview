const ipc = require("./ipcMain")
const menu = require("./menuMain")

const shared = require("./searchShared")

const FIND_MENU_ID = "find"
const FIND_NEXT_MENU_ID = "find-next"
const FIND_PREVIOUS_MENU_ID = "find-previous"

let _mainMenu

exports.FIND_MENU_ID = FIND_MENU_ID

exports.FIND_NEXT_MENU_ID = FIND_NEXT_MENU_ID

exports.FIND_PREVIOUS_MENU_ID = FIND_PREVIOUS_MENU_ID

exports.SEARCH_RESULT_CLASS = shared.SEARCH_RESULT_CLASS

exports.SELECTED_SEARCH_RESULT_ID = shared.SELECTED_SEARCH_RESULT_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    ipc.listen(ipc.messages.searchIsActive, isActive => {
        menu.setEnabled(_mainMenu, FIND_NEXT_MENU_ID, isActive)
        menu.setEnabled(_mainMenu, FIND_PREVIOUS_MENU_ID, isActive)
    })
}

exports.start = () => ipc.send(ipc.messages.search)

exports.next = () => ipc.send(ipc.messages.searchNext)

exports.previous = () => ipc.send(ipc.messages.searchPrevious)
