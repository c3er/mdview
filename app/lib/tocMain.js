const ipc = require("./ipcMain")
const menu = require("./menuMain")
const navigation = require("./navigationMain")
const storage = require("./storageMain")

const shared = require("./tocShared")

const SHOW_FOR_ALL_DOCS_MENU_ID = "show-for-all-docs"
const SHOW_FOR_THIS_DOC_MENU_ID = "show-for-this-doc"
const FORGET_DOCUMENT_OVERRIDE_MENU_ID = "forget-document-override"

const UPDATE_TOC_NAV_ID = "update-toc"

let _mainMenu
let _applicationSettings
let _info

function update(documentSettings) {
    documentSettings ??= storage.loadDocumentSettings()
    const showTocOverridesAppSettings = documentSettings.showTocOverridesAppSettings
    menu.setChecked(_mainMenu, SHOW_FOR_ALL_DOCS_MENU_ID, _applicationSettings.showToc)
    menu.setChecked(
        _mainMenu,
        SHOW_FOR_THIS_DOC_MENU_ID,
        showTocOverridesAppSettings && documentSettings.showToc,
    )
    menu.setEnabled(_mainMenu, FORGET_DOCUMENT_OVERRIDE_MENU_ID, showTocOverridesAppSettings)
    ipc.send(ipc.messages.updateToc, _info)
}

function determineTocVisibility(documentSettings) {
    return documentSettings.showTocOverridesAppSettings
        ? documentSettings.showToc
        : _applicationSettings.showToc
}

exports.SHOW_FOR_ALL_DOCS_MENU_ID = SHOW_FOR_ALL_DOCS_MENU_ID

exports.SHOW_FOR_THIS_DOC_MENU_ID = SHOW_FOR_THIS_DOC_MENU_ID

exports.FORGET_DOCUMENT_OVERRIDE_MENU_ID = FORGET_DOCUMENT_OVERRIDE_MENU_ID

exports.init = (mainMenu, applicationSettings) => {
    _mainMenu = mainMenu
    _applicationSettings = applicationSettings
    const documentSettings = storage.loadDocumentSettings()

    _info = {
        isVisible: determineTocVisibility(documentSettings),
        widthPx: applicationSettings.tocWidth ?? shared.WIDTH_DEFAULT_PX,
        collapsedEntries: documentSettings.collapsedTocEntries,
    }
    update(documentSettings)

    navigation.register(UPDATE_TOC_NAV_ID, () => {
        const documentSettings = storage.loadDocumentSettings()
        _info.isVisible = determineTocVisibility(documentSettings)
        _info.collapsedEntries = documentSettings.collapsedTocEntries
        update(documentSettings)
    })

    ipc.listen(ipc.messages.updateToc, tocInfo => {
        storage.loadDocumentSettings().collapsedTocEntries = _info.collapsedEntries =
            tocInfo.collapsedEntries
        _applicationSettings.tocWidth = tocInfo.widthPx
    })
}

exports.setVisibilityForApplication = isVisible => {
    const documentSettings = storage.loadDocumentSettings()
    _applicationSettings.showToc = isVisible
    _info.isVisible = determineTocVisibility(documentSettings)
    update(documentSettings)
}

exports.setVisibilityForDocument = isVisible => {
    const documentSettings = storage.loadDocumentSettings()
    documentSettings.showTocOverridesAppSettings = true
    documentSettings.showToc = isVisible
    _info.isVisible = determineTocVisibility(documentSettings)
    update(documentSettings)
}

exports.forgetDocumentOverride = () => {
    const documentSettings = storage.loadDocumentSettings()
    documentSettings.showTocOverridesAppSettings = false
    _info.isVisible = determineTocVisibility(documentSettings)
    update(documentSettings)
}

exports.update = update
