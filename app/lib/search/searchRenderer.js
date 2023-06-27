const renderer = require("../renderer/common")

const SEARCH_RESULT_CLASS = "search-result"
const SELECTED_SEARCH_RESULT_ID = "selected-search-result"
const CANCEL_VALUE = "search-dialog-cancel"

const RESULT_START_TAG = '<span class="search-result">'
const END_TAG = "</span>"

let _document
let _searchDialog
let _searchInputElement

let _isActive = false
let _term = null
let _searchIndex = 0

function deactivate() {
    _isActive = false
    _term = null
    _searchIndex = 0
}

exports.init = (document, reloader) => {
    _document = document

    _searchInputElement = _document.getElementById("search-input")
    _searchDialog = _document.getElementById("search-dialog")
    _searchDialog.addEventListener("close", () => {
        const result = _searchDialog.returnValue
        if (result && result !== CANCEL_VALUE) {
            _term = result
            reloader()
        } else {
            deactivate()
        }
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

exports.highlightTerm = () => {
    if (!_isActive) {
        return
    }

    const contentElement = renderer.contentElement()
    if (!contentElement.innerText.includes(_term)) {
        deactivate()
        return
    }

    contentElement.innerHTML = contentElement.innerHTML.replaceAll(
        _term,
        RESULT_START_TAG + _term + END_TAG,
    )
    const searchResultElements = _document.getElementsByClassName(SEARCH_RESULT_CLASS)
    const searchResultCount = searchResultElements.length
    for (let i = 0; i < searchResultCount; i++) {
        const searchResult = searchResultElements[i]
        if (i === _searchIndex) {
            searchResult.setAttribute("id", SELECTED_SEARCH_RESULT_ID)
        } else {
            searchResult.removeAttribute("id")
        }
    }
}

exports.deactivate = deactivate
