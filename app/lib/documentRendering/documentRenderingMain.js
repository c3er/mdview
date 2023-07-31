const fileLib = require("../file")
const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")
const navigation = require("../navigation/navigationMain")
const storage = require("../main/storage")

const ENABLE_LINE_BREAKS_MENU_ID = "enable-line-breaks"
const ENABLE_TYPOGRAPHY_MENU_ID = "enable-typographic-replacements"
const ENABLE_EMOJIS_MENU_ID = "enable-emojis"
const RENDER_FILE_AS_MD_MENU_ID = "render-file-as-markdown"
const RENDER_FILE_TYPE_AS_MD_MENU_ID = "render-file-type-as-markdown"
const HIDE_METADATA_MENU_ID = "hide-metadata"

const UPDATE_FILE_SPECIFICA_NAV_ID = "update-file-specific-document-rendering"

let _mainMenu
let _applicationSettings

let _previousFilePath = ""

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
    const documentSettings = storage.loadDocumentSettings(filePath)
    ipc.send(ipc.messages.changeRenderingOptions, {
        lineBreaksEnabled: _applicationSettings.lineBreaksEnabled,
        typographyEnabled: _applicationSettings.typographyEnabled,
        emojisEnabled: _applicationSettings.emojisEnabled,
        renderAsMarkdown: documentSettings.renderAsMarkdown || isMarkdownFileType(filePath),
        hideMetadata: _applicationSettings.hideMetadata,
    })
}

function changeOption(setter) {
    setter()
    notifyOptionChanges()
}

function updateFileSpecificRendering(filePath) {
    menu.setChecked(
        _mainMenu,
        RENDER_FILE_AS_MD_MENU_ID,
        storage.loadDocumentSettings().renderAsMarkdown,
    )
    notifyOptionChanges(filePath)
}

exports.ENABLE_LINE_BREAKS_MENU_ID = ENABLE_LINE_BREAKS_MENU_ID

exports.ENABLE_TYPOGRAPHY_MENU_ID = ENABLE_TYPOGRAPHY_MENU_ID

exports.ENABLE_EMOJIS_MENU_ID = ENABLE_EMOJIS_MENU_ID

exports.RENDER_FILE_AS_MD_MENU_ID = RENDER_FILE_AS_MD_MENU_ID

exports.RENDER_FILE_TYPE_AS_MD_MENU_ID = RENDER_FILE_TYPE_AS_MD_MENU_ID

exports.HIDE_METADATA_MENU_ID = HIDE_METADATA_MENU_ID

exports.init = (mainMenu, applicationSettings, filePath) => {
    _mainMenu = mainMenu
    _applicationSettings = applicationSettings
    navigation.register(UPDATE_FILE_SPECIFICA_NAV_ID, () => {
        const filePath = navigation.getCurrentLocation().filePath
        if (filePath !== _previousFilePath) {
            updateFileSpecificRendering(filePath)
        }
        _previousFilePath = filePath
    })

    menu.setChecked(_mainMenu, ENABLE_LINE_BREAKS_MENU_ID, applicationSettings.lineBreaksEnabled)
    menu.setChecked(_mainMenu, ENABLE_TYPOGRAPHY_MENU_ID, applicationSettings.typographyEnabled)
    menu.setChecked(_mainMenu, ENABLE_EMOJIS_MENU_ID, applicationSettings.emojisEnabled)
    menu.setChecked(_mainMenu, RENDER_FILE_TYPE_AS_MD_MENU_ID, isMarkdownFileType(filePath))
    menu.setChecked(
        _mainMenu,
        RENDER_FILE_AS_MD_MENU_ID,
        storage.loadDocumentSettings(filePath).renderAsMarkdown,
    )
    menu.setChecked(_mainMenu, HIDE_METADATA_MENU_ID, applicationSettings.hideMetadata)

    notifyOptionChanges(filePath)
}

exports.switchEnableLineBreaks = () =>
    changeOption(
        () =>
            (_applicationSettings.lineBreaksEnabled = menu.getChecked(
                _mainMenu,
                ENABLE_LINE_BREAKS_MENU_ID,
            )),
    )

exports.switchEnableTypography = () =>
    changeOption(
        () =>
            (_applicationSettings.typographyEnabled = menu.getChecked(
                _mainMenu,
                ENABLE_TYPOGRAPHY_MENU_ID,
            )),
    )

exports.switchEnableEmojis = () =>
    changeOption(
        () =>
            (_applicationSettings.emojisEnabled = menu.getChecked(
                _mainMenu,
                ENABLE_EMOJIS_MENU_ID,
            )),
    )

exports.switchRenderFileAsMarkdown = filePath => {
    changeOption(
        () =>
            (storage.loadDocumentSettings(filePath).renderAsMarkdown = menu.getChecked(
                _mainMenu,
                RENDER_FILE_AS_MD_MENU_ID,
            )),
    )
}

exports.switchRenderFileTypeAsMarkdown = filePath =>
    changeOption(() =>
        setRenderFileTypeAsMarkdown(
            filePath,
            menu.getChecked(_mainMenu, RENDER_FILE_TYPE_AS_MD_MENU_ID),
        ),
    )

exports.hideMetadata = () =>
    changeOption(
        () =>
            (_applicationSettings.hideMetadata = menu.getChecked(_mainMenu, HIDE_METADATA_MENU_ID)),
    )
