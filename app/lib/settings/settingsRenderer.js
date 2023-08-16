const ipc = require("../ipc/ipcRenderer")

const DIALOG_TAB_CLASS = "dialog-tab"
const DIALOG_TAB_CONSTENT_CLASS = "dialog-tab-content"

let _document
let _dialogElement

let _dialogIsOpen = false

let _tabElements
let _tabContentElements

let _applicationSettings
let _documentSettings

function applySettings() {
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

    _tabElements = [..._document.getElementsByClassName(DIALOG_TAB_CLASS)]
    _tabContentElements = [..._document.getElementsByClassName(DIALOG_TAB_CONSTENT_CLASS)]

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

        _dialogElement.showModal()
        _document.getElementById("settings-ok-button").focus()
        _dialogIsOpen = true
        ipc.send(ipc.messages.settingsDialogIsOpen, true)
    })
}

exports.close = () => _dialogElement.close()

exports.isOpen = () => _dialogIsOpen
