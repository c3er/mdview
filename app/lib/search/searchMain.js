const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")

const FIND_NEXT_MENU_ID = "find-next"
const FIND_PREVIOUS_MENU_ID = "find-previous"

let _mainMenu

exports.FIND_NEXT_MENU_ID = FIND_NEXT_MENU_ID

exports.FIND_PREVIOUS_MENU_ID = FIND_PREVIOUS_MENU_ID

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
