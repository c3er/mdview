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

// A String.prototype.replaceAll() alternative, that is case insensitive at the input
// ("pattern parameter") but preserves the case during replacing.
function replaceAll(text, pattern, replacement) {
    const output = []
    let lastIndex = text.length - 1

    // Based on https://stackoverflow.com/a/1499916 (Remove HTML Tags in Javascript with Regex)
    const tagMatches = [...text.matchAll(/(<([^>]+)>)/g)]

    const matches = [...text.matchAll(pattern)]
    for (const match of matches.toReversed()) {
        const term = match[0]
        if (
            tagMatches.some(tagMatch => {
                const tagMatchIndex = tagMatch.index
                const matchIndex = match.index
                return (
                    tagMatchIndex < matchIndex &&
                    tagMatchIndex + tagMatch[0].length > matchIndex + term.length
                )
            })
        ) {
            continue
        }
        output.push(text.substring(match.index + term.length, lastIndex))
        output.push(replacement.replace(new RegExp(term, "i"), term))
        lastIndex = match.index
    }
    output.push(text.substring(0, lastIndex))
    return output.reverse().join("")
}

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

    const termRegex = new RegExp(_term, "ig")
    const contentElement = renderer.contentElement()
    if (!contentElement.innerText.match(termRegex)) {
        deactivate()
        return
    }

    contentElement.innerHTML = replaceAll(
        contentElement.innerHTML,
        termRegex,
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
