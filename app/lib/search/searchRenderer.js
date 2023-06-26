const CANCEL_VALUE = "search-dialog-cancel"

let _document
let _searchDialog
let _searchInputElement

let _isActive = false

exports.init = (document, callback) => {
    _document = document

    _searchInputElement = _document.getElementById("search-input")
    _searchDialog = _document.getElementById("search-dialog")
    _searchDialog.addEventListener("close", () => {
        const result = _searchDialog.returnValue
        if (result && result !== CANCEL_VALUE) {
            callback(result)
        }
        _isActive = false
    })

    _document.getElementById("search-ok-button").addEventListener("click", event => {
        event.preventDefault()
        _searchDialog.close(_searchInputElement.value)
    })
}

exports.showDialog = () => {
    _searchDialog.showModal()
    _searchInputElement.setSelectionRange(0, _searchInputElement.value.length)
    _isActive = true
}

exports.isActive = () => _isActive
