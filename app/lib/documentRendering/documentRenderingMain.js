const ipc = require("../ipc/ipcMain")

const ENABLE_LINE_BREAKS_MENU_ID = "enable-line-breaks"
const ENABLE_TYPOGRAPHY_MENU_ID = "enable-typographic-replacements"
const ENABLE_EMOJIS_MENU_ID = "enable-emojis"

let _mainMenu
let _applicationSettings

function setMenuItemState(id, isChecked) {
    _mainMenu.getMenuItemById(id).checked = isChecked
}

function getMenuItemState(id) {
    return _mainMenu.getMenuItemById(id).checked
}

function notifyOptionChanges() {
    ipc.send(ipc.messages.changeRenderingOptions, {
        lineBreaksEnabled: _applicationSettings.lineBreaksEnabled,
        typographyEnabled: _applicationSettings.typographyEnabled,
        emojisEnabled: _applicationSettings.emojisEnabled,
    })
}

function changeOption(setter) {
    setter()
    notifyOptionChanges()
}

exports.ENABLE_LINE_BREAKS_MENU_ID = ENABLE_LINE_BREAKS_MENU_ID

exports.ENABLE_TYPOGRAPHY_MENU_ID = ENABLE_TYPOGRAPHY_MENU_ID

exports.ENABLE_EMOJIS_MENU_ID = ENABLE_EMOJIS_MENU_ID

exports.init = (mainMenu, applicationSettings) => {
    _mainMenu = mainMenu
    _applicationSettings = applicationSettings

    setMenuItemState(ENABLE_LINE_BREAKS_MENU_ID, applicationSettings.lineBreaksEnabled)
    setMenuItemState(ENABLE_TYPOGRAPHY_MENU_ID, applicationSettings.typographyEnabled)
    setMenuItemState(ENABLE_EMOJIS_MENU_ID, applicationSettings.emojisEnabled)

    notifyOptionChanges()
}

exports.switchEnableLineBreaks = () =>
    changeOption(
        () =>
            (_applicationSettings.lineBreaksEnabled = getMenuItemState(ENABLE_LINE_BREAKS_MENU_ID))
    )

exports.switchEnableTypography = () =>
    changeOption(
        () => (_applicationSettings.typographyEnabled = getMenuItemState(ENABLE_TYPOGRAPHY_MENU_ID))
    )

exports.switchEnableEmojis = () =>
    changeOption(
        () => (_applicationSettings.emojisEnabled = getMenuItemState(ENABLE_EMOJIS_MENU_ID))
    )
