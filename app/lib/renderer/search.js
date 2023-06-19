let _document
let _searchDialog

exports.init = (document, callback) => {
    _document = document

    _searchDialog = _document.getElementById("search-dialog")
    _searchDialog.addEventListener("close", () => callback(_searchDialog.returnValue))

    const okButton = _document.getElementById("search-ok-button")
    const searchInputElement = _document.getElementById("search-input")
    okButton.addEventListener("click", event => {
        event.preventDefault()
        _searchDialog.close(searchInputElement.value)
    })
}

exports.showDialog = () => _searchDialog.showModal()
