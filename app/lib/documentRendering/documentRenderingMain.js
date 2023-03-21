const fileLib = require("../file")
const ipc = require("../ipc/ipcMain")
const mainMenu = require("../main/mainMenu")
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

function isMarkdownFileType(filePath) {
    return _applicationSettings.mdFileTypes.includes(fileLib.extractFileEnding(filePath))
}

function setRenderFileTypeAsMarkdown(filePath, shallRenderAsMarkdown) {
    const mdFileTypes = _applicationSettings.mdFileTypes
    const ending = fileLib.extractFileEnding(filePath)
    if (shallRenderAsMarkdown) {
        if (mdFileTypes.find(item => item === ending)) {
            return
        }
        mdFileTypes.push(ending)
        _applicationSettings.mdFileTypes = mdFileTypes
    } else {
        _applicationSettings.mdFileTypes = mdFileTypes.filter(item => item !== ending)
    }
}

function notifyOptionChanges(filePath) {
    filePath = filePath ?? navigation.getCurrentLocation().filePath
    const documentSettings = storage.loadDocumentSettings(filePath)
    ipc.send(ipc.messages.changeRenderingOptions, {
        lineBreaksEnabled: _applicationSettings.lineBreaksEnabled,
        typographyEnabled: _applicationSettings.typographyEnabled,
        emojisEnabled: _applicationSettings.emojisEnabled,
        renderAsMarkdown: documentSettings.renderAsMarkdown || isMarkdownFileType(filePath),
    })
}

function changeOption(setter) {
    setter()
    notifyOptionChanges()
}

function updateFileSpecificRendering() {
    mainMenu.setItemState(
        _mainMenu,
        RENDER_FILE_AS_MD_MENU_ID,
        storage.loadDocumentSettings().renderAsMarkdown
    )
    notifyOptionChanges()
}

exports.ENABLE_LINE_BREAKS_MENU_ID = ENABLE_LINE_BREAKS_MENU_ID

exports.ENABLE_TYPOGRAPHY_MENU_ID = ENABLE_TYPOGRAPHY_MENU_ID

exports.ENABLE_EMOJIS_MENU_ID = ENABLE_EMOJIS_MENU_ID

exports.RENDER_FILE_AS_MD_MENU_ID = RENDER_FILE_AS_MD_MENU_ID

exports.RENDER_FILE_TYPE_AS_MD_MENU_ID = RENDER_FILE_TYPE_AS_MD_MENU_ID

exports.init = (mainMenuObj, applicationSettings, filePath) => {
    _mainMenu = mainMenuObj
    _applicationSettings = applicationSettings
    navigation.register(UPDATE_FILE_SPECIFICA_NAV_ID, updateFileSpecificRendering)

    mainMenu.setItemState(
        _mainMenu,
        ENABLE_LINE_BREAKS_MENU_ID,
        applicationSettings.lineBreaksEnabled
    )
    mainMenu.setItemState(
        _mainMenu,
        ENABLE_TYPOGRAPHY_MENU_ID,
        applicationSettings.typographyEnabled
    )
    mainMenu.setItemState(_mainMenu, ENABLE_EMOJIS_MENU_ID, applicationSettings.emojisEnabled)
    mainMenu.setItemState(_mainMenu, RENDER_FILE_TYPE_AS_MD_MENU_ID, isMarkdownFileType(filePath))
    mainMenu.setItemState(
        _mainMenu,
        RENDER_FILE_AS_MD_MENU_ID,
        storage.loadDocumentSettings(filePath).renderAsMarkdown
    )

    notifyOptionChanges(filePath)
}

exports.switchEnableLineBreaks = () =>
    changeOption(
        () =>
            (_applicationSettings.lineBreaksEnabled = mainMenu.getItemState(
                _mainMenu,
                ENABLE_LINE_BREAKS_MENU_ID
            ))
    )

exports.switchEnableTypography = () =>
    changeOption(
        () =>
            (_applicationSettings.typographyEnabled = mainMenu.getItemState(
                _mainMenu,
                ENABLE_TYPOGRAPHY_MENU_ID
            ))
    )

exports.switchEnableEmojis = () =>
    changeOption(
        () =>
            (_applicationSettings.emojisEnabled = mainMenu.getItemState(
                _mainMenu,
                ENABLE_EMOJIS_MENU_ID
            ))
    )

exports.switchRenderFileAsMarkdown = filePath => {
    changeOption(
        () =>
            (storage.loadDocumentSettings(filePath).renderAsMarkdown = mainMenu.getItemState(
                _mainMenu,
                RENDER_FILE_AS_MD_MENU_ID
            ))
    )
}

exports.switchRenderFileTypeAsMarkdown = filePath =>
    changeOption(() =>
        setRenderFileTypeAsMarkdown(
            filePath,
            mainMenu.getItemState(_mainMenu, RENDER_FILE_TYPE_AS_MD_MENU_ID)
        )
    )
