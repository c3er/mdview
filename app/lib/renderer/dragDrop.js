const fs = require("fs")

const dialog = require("../renderer/dialog")
const error = require("../error/errorRenderer")
const file = require("../file")
const navigation = require("../navigation/navigationRenderer")

let _document

let _dialogElement

let _dialogIsOpen = false
let _filePath = ""

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
        openDialog()
    }
}

exports.init = document => {
    _document = document

    _dialogElement = _document.getElementById("drag-drop-dialog")

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

// For testing

exports.dropHandler = dropHandler
