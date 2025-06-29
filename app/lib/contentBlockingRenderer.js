const dialog = require("./dialogRenderer")
const ipc = require("./ipcRenderer")
const log = require("./log")
const renderer = require("./commonRenderer")

const DIALOG_ID = "content-blocking"

let remote

let _isInitialized = false

let _document
let _window
let _unblockContentButton
let _dialogElement
let _dialogOkButton

class ContentList {
    #data

    constructor(data) {
        this.#data = data ?? []
    }

    get urls() {
        return this.#data.map(content => content.url)
    }

    add(content) {
        const existingIndex = this.#data.findIndex(existing => existing.url === content.url)
        if (existingIndex === -1) {
            this.#data.push(content)
        } else {
            this.#data[existingIndex] = content
        }
    }

    byUrl(url) {
        return this.#data.find(content => content.url === url)
    }

    remove(url) {
        this.#data = this.#data.filter(content => content.url !== url)
    }

    reset() {
        this.#data = []
    }

    isEmpty() {
        return this.#data.length === 0
    }

    filter(predicate) {
        return new ContentList(this.#data.filter(predicate))
    }

    some(predicate) {
        return this.#data.some(predicate)
    }

    toHtml() {
        return `
            <table>
                ${this.#data.map(content => content.toHtml()).join("\n")}
            </table>
        `
    }

    handleClick() {
        for (const content of this.#data) {
            content.handleClick()
        }
    }

    resetSelection() {
        for (const content of this.#data) {
            content.shallBeUnblocked = true
        }
    }
}

class Content {
    url = ""
    id = ""
    elements = []
    shallBeUnblocked = true

    constructor(url) {
        this.url = url
        this.id = Content._url2id(url)
        this.elements = Content._searchElementsWithAttributeValue(url)
        for (const element of this.elements) {
            element.onclick = () => createUnblockMenu(url)
        }
    }

    get checkBoxElement() {
        return _document.querySelector(`tr#${this.id} input`)
    }

    unblock() {
        for (const element of this.elements) {
            element.removeAttribute("style")

            // Force element to reload without recreating the DOM element.
            // Recreating the DOM element would cause the attached event handlers to be lost.
            const attributes = element.attributes
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i]
                const value = attr.nodeValue
                if (value === this.url) {
                    element.setAttribute(attr.nodeName, value)
                }
            }
        }
    }

    toHtml() {
        return `
            <tr id="${this.id}">
                <td><input type="checkbox" /></td>
                <td>${this.url}</td>
            </tr>
        `
    }

    handleClick() {
        this.checkBoxElement.checked = this.shallBeUnblocked
        _document.querySelector(`tr#${this.id}`).onclick = () => {
            this.shallBeUnblocked = this.checkBoxElement.checked = !this.shallBeUnblocked
            updateDialogOkButton()
        }
    }

    static _url2id(url) {
        let id = url.replace(/[^a-zA-Z0-9]/g, "-")
        if (!/^[a-zA-Z]/.test(id)) {
            id = `_${id}`
        }
        return id
    }

    static _searchElementsWithAttributeValue(value) {
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
}

const _contents = new ContentList()

function updateDialogOkButton() {
    _dialogOkButton.disabled = !_contents.some(content => content.shallBeUnblocked)
}

function changeInfoElementVisiblity(isVisible) {
    const infoElement = _document.querySelector("div#blocked-content-info")
    infoElement.style.display = isVisible ? "flex" : "none"

    // If the info element is visible, adapt the top margin of the body element,
    // otherwise, remove (set to an empty string) the custom margin from the body element
    _document.querySelector("main#content").style.marginTop = isVisible
        ? _window.getComputedStyle(infoElement).height
        : ""
}

function createUnblockAllMenu() {
    const unblockContentButtonRect = _unblockContentButton.getBoundingClientRect()
    remote.Menu.buildFromTemplate([
        {
            label: "Temporary",
            click() {
                unblockAll()
            },
        },
        {
            label: "Permanent",
            click() {
                openDialog()
            },
        },
    ]).popup({
        x: Math.ceil(unblockContentButtonRect.left),
        y: Math.ceil(unblockContentButtonRect.bottom),
    })
}

function createUnblockMenu(url) {
    remote.Menu.buildFromTemplate([
        {
            label: "Unblock Temporary",
            click() {
                unblockUrl(url)
            },
        },
        {
            label: "Unblock Permanently",
            click() {
                storeUnblockedUrl(url)
                unblockUrl(url)
            },
        },
    ]).popup()
}

function hasBlockedElements() {
    return !_contents.isEmpty()
}

function unblockUrl(url) {
    ipc.send(ipc.messages.unblockUrl, url)

    _contents.byUrl(url)?.unblock()
    _contents.remove(url)

    if (!hasBlockedElements()) {
        changeInfoElementVisiblity(false)
        ipc.send(ipc.messages.allContentUnblocked)
    }

    log.info(`Unblocked: ${url}`)
}

function unblockAll() {
    for (const url of _contents.urls) {
        unblockUrl(url)
    }
}

function unblockSelected() {
    for (const url of _contents.filter(content => content.shallBeUnblocked).urls) {
        unblockUrl(url)
    }
}

function storeUnblockedUrl(url) {
    ipc.send(ipc.messages.storeUnblockedUrl, url)
    log.info(`Stored unblocked URL: ${url}`)
}

function storeSelectedUnblocked() {
    for (const url of _contents.filter(content => content.shallBeUnblocked).urls) {
        storeUnblockedUrl(url)
    }
}

function openDialog() {
    dialog.open(
        DIALOG_ID,
        () => {
            _contents.resetSelection()
            _document.querySelector("dialog #content-blocking-dialog-scroll-container").innerHTML =
                _contents.toHtml()
            _contents.handleClick()
            _dialogElement.showModal()
        },
        () => _dialogElement.close(),
    )
}

function reset() {
    _contents.reset()
}

exports.init = (document, window, shallForceInitialization, remoteMock) => {
    if (_isInitialized && !shallForceInitialization) {
        return
    }

    remote = remoteMock ?? require("@electron/remote")

    _document = document
    _window = window
    _unblockContentButton = _document.querySelector("button#unblock-content-button")
    _dialogElement = _document.querySelector("dialog#content-blocking-dialog")
    _dialogOkButton = _document.querySelector("button#content-blocking-ok-button")

    renderer.addStdButtonHandler(_unblockContentButton, createUnblockAllMenu)
    renderer.addStdButtonHandler(_dialogOkButton, () => {
        storeSelectedUnblocked()
        unblockSelected()
        _dialogElement.close()
    })
    renderer.addStdButtonHandler(
        _document.querySelector("button#content-blocking-cancel-button"),
        () => _dialogElement.close(),
    )
    ipc.listen(ipc.messages.contentBlocked, url => {
        _contents.add(new Content(url))
        changeInfoElementVisiblity(true)
        _document.querySelector("span#blocked-content-info-close-button").onclick = () =>
            changeInfoElementVisiblity(false)
    })
    ipc.listen(ipc.messages.resetContentBlocking, reset)
    ipc.listen(ipc.messages.unblockAll, unblockAll)

    _isInitialized = true
}

exports.hasBlockedElements = hasBlockedElements

exports.changeInfoElementVisiblity = changeInfoElementVisiblity

exports.reset = reset
