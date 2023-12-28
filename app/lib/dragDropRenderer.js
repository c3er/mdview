const dialog = require("./renderer/dialog")
const ipc = require("./ipcRenderer")
const navigation = require("./navigationRenderer")

const shared = require("./dragDropShared")

const DIALOG_ID = "drag-drop"

let _document

let _dialogElement
let _rememberChoiceCheckbox

let _filePath = ""
let _behavior = shared.behavior.ask

function openDialog() {
    dialog.open(
        DIALOG_ID,
        () => {
            _dialogElement.showModal()
            _rememberChoiceCheckbox.checked = false
        },
        () => _dialogElement.close(),
    )
}

function openFile(shallOpenInNewWindow) {
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
    if (!navigation.checkFile(filePath)) {
        return
    }

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

exports.DIALOG_ID = DIALOG_ID

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

    dialog.addStdButtonHandler(_document.getElementById("drag-drop-open-in-current-window"), () => {
        dialog.close()
        openFile(false)
    })
    dialog.addStdButtonHandler(_document.getElementById("drag-drop-open-in-new-window"), () => {
        dialog.close()
        openFile(true)
    })
    dialog.addStdButtonHandler(_document.getElementById("drag-drop-cancel"), dialog.close)
}

exports.setBehavior = value => (_behavior = value)

// For testing

exports.dropHandler = dropHandler

exports.reset = () => {
    _filePath = ""
    _behavior = shared.behavior.ask
}
