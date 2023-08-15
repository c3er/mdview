const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")

const SETTINGS_MENU_ID = "settings"

let _mainMenu

exports.SETTINGS_MENU_ID = SETTINGS_MENU_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    ipc.listen(ipc.messages.settingsDialogIsOpen, isOpen =>
        menu.setEnabled(_mainMenu, SETTINGS_MENU_ID, !isOpen),
    )
}

exports.open = () => ipc.send(ipc.messages.settings)
