const common = require("../common")
const fileLib = require("../file")
const ipc = require("../ipc/ipcRenderer")

let _document
let _dialogElement

let _dialogIsOpen = false

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
let _renderFileTypeAsMarkdownCheckbox
let _showTocCheckbox
let _showTocForDocumentCheckbox
let _renderDocumentAsMarkdownCheckbox

let _applicationSettings
let _documentSettings
let _filePath

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
    _renderFileTypeAsMarkdownCheckbox.checked = _applicationSettings.mdFileTypes.some(fileType =>
        _filePath.endsWith(fileType),
    )
    _showTocCheckbox.checked = _applicationSettings.showToc

    // Document settings
    updateTocForDocumentCheckbox()
    _renderDocumentAsMarkdownCheckbox.checked = _documentSettings.renderAsMarkdown
}

function applySettings() {
    // Application settings
    _applicationSettings.theme = Object.entries({
        system: _systemThemeRadioButton,
        light: _lightThemeRadioButton,
        dark: _darkThemeRadioButton,
    })
        .filter(([, element]) => element.checked)
        .map(([theme]) => theme)[0]
    _applicationSettings.zoom = Number(_zoomInput.value)
    _applicationSettings.lineBreaksEnabled = _singleLineBreakCheckbox.checked
    _applicationSettings.typographyEnabled = _typographyEnabledCheckbox.checked
    _applicationSettings.emojisEnabled = _enableEmojisCheckbox.checked
    _applicationSettings.hideMetadata = _hideMetadataCheckbox.checked
    updateMdFileTypeSetting(_renderFileTypeAsMarkdownCheckbox.checked)
    _applicationSettings.showToc = _showTocCheckbox.checked

    // Document settings
    _documentSettings.showToc = _showTocForDocumentCheckbox.checked
    _documentSettings.renderAsMarkdown = _renderDocumentAsMarkdownCheckbox.checked

    ipc.send(ipc.messages.applySettings, _applicationSettings, _documentSettings)
}

function changeTab(tabIndex) {
    const tabCount = _tabElements.length
    for (let i = 0; i < tabCount; i++) {
        _tabElements[i].style.borderBottomStyle = i === tabIndex ? "none" : "solid"
        _tabContentElements[i].style.display = i === tabIndex ? "block" : "none"
    }
}

function handleConfirm(event) {
    event.preventDefault()
    applySettings()
    _dialogElement.close()
}

exports.init = document => {
    _document = document
    _dialogElement = _document.getElementById("settings-dialog")

    _systemThemeRadioButton = _document.getElementById("system-theme")
    _lightThemeRadioButton = _document.getElementById("light-theme")
    _darkThemeRadioButton = _document.getElementById("dark-theme")
    _zoomInput = _document.getElementById("zoom")
    _singleLineBreakCheckbox = _document.getElementById("single-line-break")
    _typographyEnabledCheckbox = _document.getElementById("typographic-replacements")
    _enableEmojisCheckbox = _document.getElementById("emoticons-to-emojis")
    _hideMetadataCheckbox = _document.getElementById("hide-metadata")
    _renderFileTypeAsMarkdownCheckbox = _document.getElementById("render-filetype-as-markdown")
    _showTocCheckbox = _document.getElementById("show-toc")
    _showTocForDocumentCheckbox = _document.getElementById("show-toc-for-doc")
    _renderDocumentAsMarkdownCheckbox = _document.getElementById("render-doc-as-markdown")

    _tabElements = [..._document.getElementsByClassName("dialog-tab")]
    _tabContentElements = [..._document.getElementsByClassName("dialog-tab-content")]

    // Tabs should have the same height. To determine the maximum height, the dialog has to be visible.
    _dialogElement.show()
    const maxTabHeight = Math.max(..._tabContentElements.map(element => element.clientHeight))
    _dialogElement.close()

    const tabCount = _tabElements.length
    for (let i = 0; i < tabCount; i++) {
        _tabElements[i].addEventListener("click", () => changeTab(i))
        _tabContentElements[i].style.minHeight = `${maxTabHeight}px`
    }
    changeTab(0)

    _dialogElement.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            handleConfirm(event)
        }
    })
    _dialogElement.addEventListener("close", () => {
        _dialogIsOpen = false
        ipc.send(ipc.messages.settingsDialogIsOpen, false)
    })

    _document.getElementById("reset-zoom-button").addEventListener("click", event => {
        event.preventDefault()
        _document.getElementById("zoom").value = _applicationSettings.zoom = common.ZOOM_DEFAULT
    })
    _document.getElementById("forget-toc-override-button").addEventListener("click", event => {
        event.preventDefault()
        _documentSettings.showTocOverridesAppSettings = false
        updateTocForDocumentCheckbox()
    })
    _showTocForDocumentCheckbox.addEventListener(
        "click",
        () => (_documentSettings.showTocOverridesAppSettings = true),
    )

    _document.getElementById("settings-ok-button").addEventListener("click", handleConfirm)
    _document.getElementById("settings-apply-button").addEventListener("click", event => {
        event.preventDefault()
        applySettings()
    })

    ipc.listen(ipc.messages.settings, (applicationSettings, documentSettings) => {
        console.log("applicationSettings", applicationSettings)
        console.log("documentSettings", documentSettings)

        _applicationSettings = applicationSettings
        _documentSettings = documentSettings
        populateDialog()

        _dialogElement.showModal()
        _document.getElementById("settings-ok-button").focus()
        _dialogIsOpen = true
        ipc.send(ipc.messages.settingsDialogIsOpen, true)
    })
}

exports.close = () => _dialogElement.close()

exports.isOpen = () => _dialogIsOpen

exports.setFilePath = filePath => (_filePath = filePath)
