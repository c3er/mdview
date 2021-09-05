const common = require("../common")
const ipc = require("../ipc")

let electron

const _elementIDs = {
    element: "blocked-content-info",
    textContainer: "blocked-content-info-text-container",
    closeButton: "blocked-content-info-close-button",
}

let _isInitialized = false

let _document
let _window

let _blockedElements = {}

function searchElementsWithAttributeValue(value) {
    // Based on https://stackoverflow.com/a/30840550 (JQuery selector using value, but unknown attribute)
    const elements = _document.getElementsByTagName("*")
    const foundElements = []
    for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
        const element = elements[elementIndex]
        const attributes = element.attributes
        for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
            if (attributes[attrIndex].nodeValue === value) {
                foundElements.push(element)
                break
            }
        }
    }
    return foundElements
}

function changeInfoElementVisiblity(isVisible) {
    const infoElement = _document.getElementById("blocked-content-info")
    infoElement.hidden = !isVisible
    // if the info element is visible, the adapt the top margin of the body element,
    // otherwise, remove (set to an empty string) the custom margin from the body element
    _document.body.style.marginTop = isVisible ? _window.getComputedStyle(infoElement).height : ""
}

function hasBlockedElements() {
    return !common.isEmptyObject(_blockedElements)
}

function unblockURL(url) {
    electron.ipcRenderer.send(ipc.messages.unblockURL, url)

    const elements = _blockedElements[url]
    if (elements) {
        elements.forEach(element => {
            element.removeAttribute("style")

            // Force element to reload without recreating the DOM element.
            // Recreating the DOM element would cause the attached event handlers to be lost.
            const attributes = element.attributes
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i]
                const value = attr.nodeValue
                if (value === url) {
                    element.setAttribute(attr.nodeName, value)
                }
            }
        })
        delete _blockedElements[url]
    }

    if (!hasBlockedElements()) {
        changeInfoElementVisiblity(false)
        electron.ipcRenderer.send(ipc.messages.allContentUnblocked)
    }
}

function unblockAll() {
    for (const url in _blockedElements) {
        unblockURL(url)
    }
}

function reset() {
    _blockedElements = {}
}

exports.init = (document, window, electronMock, shallForceInitialization) => {
    if (_isInitialized && !shallForceInitialization) {
        return
    }

    _document = document
    _window = window
    electron = electronMock ?? require("electron")

    electron.ipcRenderer.on(ipc.messages.contentBlocked, (_, url) => {
        const elements = (_blockedElements[url] = searchElementsWithAttributeValue(url))
        elements.forEach(element => (element.onclick = () => unblockURL(url)))

        changeInfoElementVisiblity(true)
        _document.getElementById(_elementIDs.textContainer).onclick = unblockAll
        _document.getElementById(_elementIDs.closeButton).onclick = () =>
            changeInfoElementVisiblity(false)
    })

    electron.ipcRenderer.on(ipc.messages.resetContentBlocking, reset)

    electron.ipcRenderer.on(ipc.messages.unblockAll, unblockAll)

    _isInitialized = true
}

exports.hasBlockedElements = hasBlockedElements

exports.changeInfoElementVisiblity = changeInfoElementVisiblity

exports.reset = reset
