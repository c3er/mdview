const ipc = require("../ipc/ipcMain")
const navigation = require("../navigation/navigationMain")
const storage = require("../main/storage")

const ENABLE_LINE_BREAKS_MENU_ID = "enable-line-breaks"
const ENABLE_TYPOGRAPHY_MENU_ID = "enable-typographic-replacements"
const ENABLE_EMOJIS_MENU_ID = "enable-emojis"
const RENDER_FILE_AS_MD_MENU_ID = "render-file-as-markdown"
const RENDER_FILE_TYPE_AS_MD_MENU_ID = "render-file-type-as-markdown"

const UPDATE_FILE_SPECIFICA_NAV_ID = "update-file-specific-document-rendering"

let _mainMenu
let _applicationSettings

function setMenuItemState(id, isChecked) {
    _mainMenu.getMenuItemById(id).checked = isChecked
}

function getMenuItemState(id) {
    return _mainMenu.getMenuItemById(id).checked
}

function notifyOptionChanges(documentSettings) {
    documentSettings = documentSettings ?? storage.loadDocumentSettings()
    ipc.send(ipc.messages.changeRenderingOptions, {
        lineBreaksEnabled: _applicationSettings.lineBreaksEnabled,
        typographyEnabled: _applicationSettings.typographyEnabled,
        emojisEnabled: _applicationSettings.emojisEnabled,
        renderAsMarkdown: documentSettings.renderAsMarkdown,
    })
}

function changeOption(setter) {
    setter()
    notifyOptionChanges()
}

function updateFileSpecificRendering() {
    setMenuItemState(RENDER_FILE_AS_MD_MENU_ID, storage.loadDocumentSettings().renderAsMarkdown)
    notifyOptionChanges()
}

exports.ENABLE_LINE_BREAKS_MENU_ID = ENABLE_LINE_BREAKS_MENU_ID

exports.ENABLE_TYPOGRAPHY_MENU_ID = ENABLE_TYPOGRAPHY_MENU_ID

exports.ENABLE_EMOJIS_MENU_ID = ENABLE_EMOJIS_MENU_ID

exports.RENDER_FILE_AS_MD_MENU_ID = RENDER_FILE_AS_MD_MENU_ID

exports.RENDER_FILE_TYPE_AS_MD_MENU_ID = RENDER_FILE_TYPE_AS_MD_MENU_ID

exports.init = (mainMenu, applicationSettings, documentSettings) => {
    _mainMenu = mainMenu
    _applicationSettings = applicationSettings
    navigation.register(UPDATE_FILE_SPECIFICA_NAV_ID, updateFileSpecificRendering)

    setMenuItemState(ENABLE_LINE_BREAKS_MENU_ID, applicationSettings.lineBreaksEnabled)
    setMenuItemState(ENABLE_TYPOGRAPHY_MENU_ID, applicationSettings.typographyEnabled)
    setMenuItemState(ENABLE_EMOJIS_MENU_ID, applicationSettings.emojisEnabled)
    setMenuItemState(RENDER_FILE_AS_MD_MENU_ID, documentSettings.renderAsMarkdown)

    notifyOptionChanges(documentSettings)
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

exports.switchRenderFileAsMarkdown = () => {
    changeOption(
        () =>
            (storage.loadDocumentSettings().renderAsMarkdown =
                getMenuItemState(RENDER_FILE_AS_MD_MENU_ID))
    )
}
