const common = require("./common")
const dialog = require("./renderer/dialog")
const fileLib = require("./file")
const ipc = require("./ipcRenderer")

const DIALOG_ID = "settings"
const UNSELECTED_TAB_CLASS = "unselected-tab"

let _document
let _dialogElement
let _dialogForm

let _tabElements
let _tabContentElements

let _systemThemeRadioButton
let _lightThemeRadioButton
let _darkThemeRadioButton
let _zoomInput
let _singleLineBreakCheckbox
let _typographyEnabledCheckbox
let _enableEmojisCheckbox
let _hideMetadataCheckbox
let _dragDropAskRadioButton
let _dragDropCurrentWindowRadioButton
let _dragDropNewWindowRadioButton
let _renderFileTypeAsMarkdownCheckbox
let _fileHistorySizeInput
let _showTocCheckbox
let _showTocForDocumentCheckbox
let _renderDocumentAsMarkdownCheckbox

let _applicationSettings
let _documentSettings
let _filePath

function parseRadioButtons(radioButtonMapping) {
    return Object.entries(radioButtonMapping)
        .filter(([, radioButton]) => radioButton.checked)
        .map(([value]) => value)[0]
}

function updateTocForDocumentCheckbox() {
    _showTocForDocumentCheckbox.checked =
        _documentSettings.showTocOverridesAppSettings && _documentSettings.showToc
}

function updateMdFileTypeSetting(shallRenderAsMarkdown) {
    const mdFileTypes = _applicationSettings.mdFileTypes
    const ending = fileLib.extractFileEnding(_filePath)
    if (shallRenderAsMarkdown) {
        if (mdFileTypes.find(fileType => fileType === ending)) {
            return
        }
        mdFileTypes.push(ending)
        _applicationSettings.mdFileTypes = mdFileTypes
    } else {
        _applicationSettings.mdFileTypes = mdFileTypes.filter(fileType => fileType !== ending)
    }
}

function populateDialog() {
    ;({
        system: _systemThemeRadioButton,
        light: _lightThemeRadioButton,
        dark: _darkThemeRadioButton,
    })[_applicationSettings.theme].checked = true
    _zoomInput.value = _applicationSettings.zoom
    _singleLineBreakCheckbox.checked = _applicationSettings.lineBreaksEnabled
    _typographyEnabledCheckbox.checked = _applicationSettings.typographyEnabled
    _enableEmojisCheckbox.checked = _applicationSettings.emojisEnabled
    _hideMetadataCheckbox.checked = _applicationSettings.hideMetadata
    ;({
        ask: _dragDropAskRadioButton,
        "current-window": _dragDropCurrentWindowRadioButton,
        "new-window": _dragDropNewWindowRadioButton,
    })[_applicationSettings.dragDropBehavior].checked = true
    _renderFileTypeAsMarkdownCheckbox.checked = _applicationSettings.mdFileTypes.some(fileType =>
        _filePath.endsWith(fileType),
    )
    _fileHistorySizeInput.value = _applicationSettings.fileHistorySize
    _showTocCheckbox.checked = _applicationSettings.showToc

    // Document settings
    updateTocForDocumentCheckbox()
    _renderDocumentAsMarkdownCheckbox.checked = _documentSettings.renderAsMarkdown
}

function applySettings() {
    // Application settings
    _applicationSettings.theme = parseRadioButtons({
        system: _systemThemeRadioButton,
        light: _lightThemeRadioButton,
        dark: _darkThemeRadioButton,
    })
    _applicationSettings.zoom = Number(_zoomInput.value)
    _applicationSettings.lineBreaksEnabled = _singleLineBreakCheckbox.checked
    _applicationSettings.typographyEnabled = _typographyEnabledCheckbox.checked
    _applicationSettings.emojisEnabled = _enableEmojisCheckbox.checked
    _applicationSettings.hideMetadata = _hideMetadataCheckbox.checked
    _applicationSettings.dragDropBehavior = parseRadioButtons({
        ask: _dragDropAskRadioButton,
        "current-window": _dragDropCurrentWindowRadioButton,
        "new-window": _dragDropNewWindowRadioButton,
    })
    updateMdFileTypeSetting(_renderFileTypeAsMarkdownCheckbox.checked)
    _applicationSettings.fileHistorySize = Number(_fileHistorySizeInput.value)
    _applicationSettings.showToc = _showTocCheckbox.checked

    // Document settings
    _documentSettings.showToc = _showTocForDocumentCheckbox.checked
    _documentSettings.renderAsMarkdown = _renderDocumentAsMarkdownCheckbox.checked

    ipc.send(ipc.messages.applySettings, _applicationSettings, _documentSettings)
}

function changeTab(tabIndex) {
    const tabCount = _tabElements.length
    for (let i = 0; i < tabCount; i++) {
        const tabElement = _tabElements[i]
        const tabContentElement = _tabContentElements[i]
        if (i === tabIndex) {
            tabElement.style.borderBottomStyle = "none"
            tabElement.classList.remove(UNSELECTED_TAB_CLASS)
            tabContentElement.style.display = "block"
        } else {
            tabElement.style.borderBottomStyle = "solid"
            tabElement.classList.add(UNSELECTED_TAB_CLASS)
            tabContentElement.style.display = "none"
        }
    }
}

function closeDialog() {
    _dialogElement.close()
    ipc.send(ipc.messages.settingsDialogIsOpen, false)
}

function handleConfirm(event) {
    if (_dialogForm.reportValidity()) {
        event.preventDefault()
        applySettings()
        dialog.close()
    }
}

function handleKeyboardConfirm(event) {
    if (event.key === "Enter") {
        handleConfirm(event)
    }
}

exports.DIALOG_ID = DIALOG_ID

exports.init = document => {
    _document = document
    _dialogElement = _document.getElementById("settings-dialog")
    _dialogForm = _document.getElementById("settings-dialog-form")

    _systemThemeRadioButton = _document.getElementById("system-theme")
    _lightThemeRadioButton = _document.getElementById("light-theme")
    _darkThemeRadioButton = _document.getElementById("dark-theme")
    _zoomInput = _document.getElementById("zoom")
    _singleLineBreakCheckbox = _document.getElementById("single-line-break")
    _typographyEnabledCheckbox = _document.getElementById("typographic-replacements")
    _enableEmojisCheckbox = _document.getElementById("emoticons-to-emojis")
    _hideMetadataCheckbox = _document.getElementById("hide-metadata")
    _dragDropAskRadioButton = _document.getElementById("drag-drop-ask")
    _dragDropCurrentWindowRadioButton = _document.getElementById("drag-drop-current-window")
    _dragDropNewWindowRadioButton = _document.getElementById("drag-drop-new-window")
    _renderFileTypeAsMarkdownCheckbox = _document.getElementById("render-filetype-as-markdown")
    _fileHistorySizeInput = _document.getElementById("file-history-size")
    _showTocCheckbox = _document.getElementById("show-toc")
    _showTocForDocumentCheckbox = _document.getElementById("show-toc-for-doc")
    _renderDocumentAsMarkdownCheckbox = _document.getElementById("render-doc-as-markdown")

    _tabElements = [..._document.getElementsByClassName("dialog-tab")]
    _tabContentElements = [..._document.getElementsByClassName("dialog-tab-content")]

    // Tabs should have the same height. To determine the maximum height, the dialog has to be visible.
    _dialogElement.show()
    const maxTabHeight = Math.max(..._tabContentElements.map(element => element.clientHeight))
    _dialogElement.close() // closeDialog() not needed here

    const tabCount = _tabElements.length
    for (let i = 0; i < tabCount; i++) {
        _tabElements[i].addEventListener("click", () => changeTab(i))
        _tabContentElements[i].style.minHeight = `${maxTabHeight}px`
    }
    changeTab(0)

    _dialogElement.addEventListener("keydown", handleKeyboardConfirm)
    _zoomInput.onkeydown = handleKeyboardConfirm
    _fileHistorySizeInput.onkeydown = handleKeyboardConfirm
    dialog.addStdButtonHandler(
        _document.getElementById("reset-zoom-button"),
        () => (_zoomInput.value = _applicationSettings.zoom = common.ZOOM_DEFAULT),
    )
    dialog.addStdButtonHandler(_document.getElementById("clear-file-history-button"), () =>
        ipc.send(ipc.messages.clearFileHistory),
    )
    dialog.addStdButtonHandler(_document.getElementById("forget-toc-override-button"), () => {
        _documentSettings.showTocOverridesAppSettings = false
        updateTocForDocumentCheckbox()
    })
    _showTocForDocumentCheckbox.addEventListener(
        "click",
        () => (_documentSettings.showTocOverridesAppSettings = true),
    )

    _document.getElementById("settings-ok-button").addEventListener("click", handleConfirm)
    dialog.addStdButtonHandler(_document.getElementById("settings-cancel-button"), dialog.close)
    _document.getElementById("settings-apply-button").addEventListener("click", event => {
        if (_dialogForm.reportValidity()) {
            event.preventDefault()
            applySettings()
        }
    })

    ipc.listen(ipc.messages.settings, (applicationSettings, documentSettings) =>
        dialog.open(
            DIALOG_ID,
            () => {
                _applicationSettings = applicationSettings
                _documentSettings = documentSettings
                populateDialog()

                _dialogElement.showModal()
                _document.getElementById("settings-ok-button").focus()
                ipc.send(ipc.messages.settingsDialogIsOpen, true)
            },
            closeDialog,
        ),
    )
}

exports.setFilePath = filePath => (_filePath = filePath)

// For testing

exports.open = () => dialog.open(DIALOG_ID, () => {}, closeDialog)

exports.getFilePath = () => _filePath
