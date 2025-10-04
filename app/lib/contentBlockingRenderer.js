const dialog = require("./dialogRenderer")
const ipc = require("./ipcRenderer")
const log = require("./log")
const navigation = require("./navigationRenderer")
const renderer = require("./commonRenderer")

const shared = require("./contentBlockingShared")

const DIALOG_ID = "content-blocking"
const UNBLOCK_PERMANENT_DIALOG_TITLE = "Unblock Content Permanently"
const MANAGE_CONTENT_DIALOG_TITLE = "Manage External Content"

let remote

let _isInitialized = false
let _localContents

let _document
let _window
let _unblockContentButton
let _dialogElement
let _contentsArea
let _dialogOkButton
let _selectAllButton
let _unselectAllButton

class ContentList {
    #data

    constructor(data) {
        this.#data = data ?? []
        for (const content of this) {
            content.parentList = this
        }
    }

    [Symbol.iterator]() {
        let index = 0
        return {
            next: () => ({
                value: this.#data[index],
                done: index++ >= this.#data.length,
            }),
        }
    }

    get modified() {
        return this.#data.filter(content => content.isModified)
    }

    get isAllUnblocked() {
        return this.every(content => !content.isBlocked)
    }

    merge(contents) {
        const merged = new ContentList(this.#data)
        for (const content of contents) {
            merged.add(content)
        }
        return merged
    }

    add(content) {
        const existingIndex = this.#data.findIndex(existing => existing.url === content.url)
        if (existingIndex === -1) {
            this.#data.push(content)
        } else {
            content.isBlocked = this.#data[existingIndex].isBlocked
            this.#data[existingIndex] = content
        }
        content.parentList = this
    }

    byUrl(url) {
        return this.#data.find(content => content.url === url)
    }

    filter(predicate) {
        return new ContentList(this.#data.filter(predicate))
    }

    some(predicate) {
        return this.#data.some(predicate)
    }

    every(predicate) {
        return this.#data.every(predicate)
    }

    updateUi(containerElement) {
        containerElement.innerHTML = this.toHtml()
        this.handleClick()
    }

    toHtml() {
        return `
            <table>
                <tr>
                    <th>Blocked</th>
                    <th>URL</th>
                </tr>
                ${this.#data.map(content => content.toHtml()).join("\n")}
            </table>
        `
    }

    handleClick() {
        for (const content of this) {
            content.handleClick()
        }
    }

    renderOriginDocuments() {
        for (const content of this) {
            content.renderOriginDocuments()
        }
    }

    selectAll() {
        this._setSelection(true)
    }

    unselectAll() {
        this._setSelection(false)
    }

    updateDialogButtons() {
        _unselectAllButton.disabled = !this.some(content => content.isBlocked)
        _selectAllButton.disabled = this.every(content => content.isBlocked)
    }

    static fromObject(obj) {
        return new ContentList(
            obj.map(contentObject => {
                const content = new Content(contentObject[shared.URL_STORAGE_KEY])
                content.isBlocked = contentObject[shared.IS_BLOCKED_STORAGE_KEY]
                content.originDocuments = contentObject[shared.DOCUMENTS_STORAGE_KEY]
                return content
            }),
        )
    }

    _setSelection(areSelected) {
        for (const content of this) {
            content.isBlocked = areSelected
        }
        this.updateDialogButtons()
    }
}

class Content {
    #isBlocked = true

    parentList
    url = ""
    id = ""
    elements = []
    originDocuments = []
    isModified = false

    constructor(url, originDocument) {
        this.url = url
        this.id = Content._url2id(url)
        if (originDocument) {
            this.originDocuments.push(originDocument)
        }
        this.elements = Content._searchElementsWithAttributeValue(url)
        for (const element of this.elements) {
            element.onclick = () => this._createUnblockMenu()
            element.onerror = () => Content._indicateBlocked(element)
        }
    }

    get isBlocked() {
        return this.#isBlocked
    }

    set isBlocked(value) {
        this.#isBlocked = value
        this.isModified = true
    }

    get rowElement() {
        return _document.querySelector(`tr#${this.id}`)
    }

    get checkBoxElement() {
        return _document.querySelector(`tr#${this.id} input`)
    }

    update(isBlocked) {
        this.isBlocked = isBlocked
        for (const element of this.elements) {
            if (isBlocked) {
                Content._indicateBlocked(element)
            } else {
                element.classList.remove("blocked")
            }

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
        this.checkBoxElement.checked = this.isBlocked
        this.rowElement.onclick = () => {
            this.isBlocked = !this.isBlocked
            this.checkBoxElement.checked = this.isBlocked
            this.parentList.updateDialogButtons()
        }
    }

    renderOriginDocuments() {
        this.rowElement.setAttribute("title", this.originDocuments.join("\n"))
    }

    store() {
        ipc.send(ipc.messages.storeUrl, this.url, this.isBlocked, this.originDocuments)
        this.isModified = false
        log.info(`Stored ${this.isBlocked ? "blocked" : "unblocked"} URL: ${this.url}`)
    }

    toString() {
        let str = `URL: ${this.url}; is blocked: ${this.isBlocked}`
        if (this.originDocuments.length > 0) {
            str += ` origin documents: ${this.originDocuments}`
        }
        return str
    }

    _createUnblockMenu() {
        const that = this
        remote.Menu.buildFromTemplate([
            {
                label: "Unblock Temporary",
                click() {
                    update(that, false)
                },
            },
            {
                label: "Unblock Permanently",
                click() {
                    update(that, false)
                    that.store()
                },
            },
        ]).popup()
    }

    static _indicateBlocked(element) {
        element.classList.add("blocked")
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
                ipc.send(ipc.messages.updateBlockedContentsRequest)
            },
        },
    ]).popup({
        x: Math.ceil(unblockContentButtonRect.left),
        y: Math.ceil(unblockContentButtonRect.bottom),
    })
}

function update(content, isBlocked) {
    content.update(isBlocked ?? content.isBlocked)
    ipc.send(ipc.messages.unblock, content.url, content.isBlocked)
    if (_localContents.isAllUnblocked) {
        changeInfoElementVisiblity(false)
        ipc.send(ipc.messages.allContentUnblocked)
    }
    log.info(`Unblocked: ${content}`)
}

function unblockAll() {
    for (const content of _localContents) {
        update(content, false)
    }
}

function setDialogTitle(title) {
    _document.querySelector("#content-blocking-dialog #content-blocking-dialog-title").innerText =
        title
}

function openDialog(title, contents, dialogIsOpenIpcMessage) {
    renderer.addStdButtonHandler(_selectAllButton, () => {
        contents.selectAll()
        contents.updateUi(_contentsArea)
    })
    renderer.addStdButtonHandler(_unselectAllButton, () => {
        contents.unselectAll()
        contents.updateUi(_contentsArea)
    })
    dialog.open(
        DIALOG_ID,
        () => {
            setDialogTitle(title)
            contents.updateDialogButtons()

            contents.updateUi(_contentsArea)
            _dialogElement.showModal()

            ipc.send(dialogIsOpenIpcMessage, true)
        },
        () => {
            _dialogElement.close()
            ipc.send(dialogIsOpenIpcMessage, false)
        },
    )
}

function reset() {
    _localContents = new ContentList()
}

exports.init = (document, window, shallForceInitialization, remoteMock) => {
    if (_isInitialized && !shallForceInitialization) {
        return
    }

    remote = remoteMock ?? require("@electron/remote")

    reset()

    _document = document
    _window = window
    _unblockContentButton = _document.querySelector("button#unblock-content-button")
    _dialogElement = _document.querySelector("dialog#content-blocking-dialog")
    _contentsArea = _document.querySelector("dialog #content-blocking-dialog-scroll-container")
    _dialogOkButton = _document.querySelector("button#content-blocking-ok-button")
    _selectAllButton = _document.querySelector("button#content-blocking-select-all-button")
    _unselectAllButton = _document.querySelector("button#content-blocking-unselect-all-button")

    renderer.addStdButtonHandler(_unblockContentButton, createUnblockAllMenu)
    renderer.addStdButtonHandler(
        _document.querySelector("button#content-blocking-cancel-button"),
        () => dialog.close(),
    )

    ipc.listen(ipc.messages.contentBlocked, url => {
        _localContents.add(new Content(url, navigation.currentFilePath()))
        changeInfoElementVisiblity(true)
        _document.querySelector("span#blocked-content-info-close-button").onclick = () =>
            changeInfoElementVisiblity(false)
    })
    ipc.listen(ipc.messages.resetContentBlocking, reset)
    ipc.listen(ipc.messages.unblockAll, unblockAll)
    ipc.listen(ipc.messages.updateBlockedContents, contentsObject => {
        openDialog(
            UNBLOCK_PERMANENT_DIALOG_TITLE,
            _localContents
                .merge(ContentList.fromObject(contentsObject))
                .filter(content => content.originDocuments.includes(navigation.currentFilePath())),
            ipc.messages.unblockDialogIsOpen,
        )
        renderer.addStdButtonHandler(_dialogOkButton, () => {
            for (const content of _localContents.modified) {
                update(content)
                content.store()
            }
            dialog.close()
        })
    })
    ipc.listen(ipc.messages.manageContentBlocking, contentsObject => {
        const contents = _localContents.merge(ContentList.fromObject(contentsObject))
        openDialog(
            MANAGE_CONTENT_DIALOG_TITLE,
            contents,
            ipc.messages.contentManagementDialogIsOpen,
        )
        contents.renderOriginDocuments()
        renderer.addStdButtonHandler(_dialogOkButton, () => {
            for (const content of contents.modified) {
                update(content)
                content.store()
            }
            dialog.close()
        })
    })

    _isInitialized = true
}

exports.hasBlockedElements = () => !_localContents.isAllUnblocked

exports.changeInfoElementVisiblity = changeInfoElementVisiblity

exports.reset = reset
