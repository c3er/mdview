const CANCEL_VALUE = "search-dialog-cancel"

let _document
let _searchDialog
let _isActive = false

exports.init = (document, callback) => {
    _document = document

    _searchDialog = _document.getElementById("search-dialog")
    _searchDialog.addEventListener("close", () => {
        const result = _searchDialog.returnValue
        if (result && result !== CANCEL_VALUE) {
            callback(result)
        }
        _isActive = false
    })

    const okButton = _document.getElementById("search-ok-button")
    const searchInputElement = _document.getElementById("search-input")
    okButton.addEventListener("click", event => {
        event.preventDefault()
        _searchDialog.close(searchInputElement.value)
    })
}

exports.showDialog = () => {
    _searchDialog.showModal()
    _isActive = true
}

exports.isActive = () => _isActive
