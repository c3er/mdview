const fs = require("fs")

const dialog = require("../renderer/dialog")
const error = require("../error/errorRenderer")
const file = require("../file")
const ipc = require("../ipc/ipcRenderer")
const navigation = require("../navigation/navigationRenderer")

const shared = require("./dragDropShared")

let _document

let _dialogElement
let _rememberChoiceCheckbox

let _dialogIsOpen = false
let _filePath = ""
let _behavior = shared.behavior.ask

function openDialog() {
    _dialogElement.showModal()
    _dialogIsOpen = true
}

function closeDialog() {
    _dialogElement.close()
    _dialogIsOpen = false
}

function openFile(shallOpenInNewWindow) {
    closeDialog()
    if (_rememberChoiceCheckbox.checked) {
        ipc.send(
            ipc.messages.dragDropBehavior,
            shallOpenInNewWindow ? shared.behavior.newWindow : shared.behavior.currentWindow,
        )
    }
    navigation.openFile(_filePath, shallOpenInNewWindow)
}

function dropHandler(event) {
    event.preventDefault()

    const filePath = event.dataTransfer.files[0].path
    const fileStat = fs.statSync(filePath)

    if (fileStat.isDirectory()) {
        error.show(`Cannot display: "${filePath}" is a directory`)
    } else if (!fileStat.isFile()) {
        error.show(`Cannot display: "${filePath}" is not a valid file`)
    } else if (!file.isText(filePath)) {
        error.show(`Cannot display: "${filePath}" is not a text file`)
    } else {
        _filePath = filePath
        switch (_behavior) {
            case shared.behavior.ask:
                openDialog()
                break
            case shared.behavior.currentWindow:
                openFile(false)
                break
            case shared.behavior.newWindow:
                openFile(true)
                break
        }
    }
}

exports.behavior = shared.behavior

exports.init = document => {
    _document = document

    _dialogElement = _document.getElementById("drag-drop-dialog")
    _rememberChoiceCheckbox = _document.getElementById("drag-drop-remember")

    _document.body.ondragover = event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
    }
    _document.body.ondrop = dropHandler

    dialog.addStdButtonHandler(_document.getElementById("drag-drop-open-in-current-window"), () =>
        openFile(false),
    )
    dialog.addStdButtonHandler(_document.getElementById("drag-drop-open-in-new-window"), () =>
        openFile(true),
    )
    dialog.addStdButtonHandler(_document.getElementById("drag-drop-cancel"), closeDialog)
}

exports.closeDialog = closeDialog

exports.dialogIsOpen = () => _dialogIsOpen

exports.setBehavior = value => (_behavior = value)

// For testing

exports.dropHandler = dropHandler
