let _document

let _dialogElement
let _dialogIsOpen = false

function closeDialog() {
    _dialogElement.close()
    _dialogIsOpen = false
}

exports.init = document => {
    _document = document

    _dialogElement = document.getElementById("error-dialog")
    _dialogIsOpen = false

    _document.getElementById("error-ok-button").addEventListener("click", event => {
        event.preventDefault()
        closeDialog()
    })
}

exports.show = msg => {
    _document.getElementById("error-dialog-content").innerText = msg
    _dialogElement.showModal()
    _dialogIsOpen = true
}

exports.close = closeDialog

exports.isOpen = () => _dialogIsOpen
