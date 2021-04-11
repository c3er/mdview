"use strict";

const path = require("path")

const electron = require("electron")
const remote = require('@electron/remote')

const common = require("./lib/common")
const documentRendering = require("./lib/documentRendering")
const file = require("./lib/file")
const ipc = require("./lib/ipc")

const TITLE = "Markdown Viewer"

const _blockedElements = {}

function isInternalLink(url) {
    return url.startsWith("#")
}

function alterTags(tagName, handler) {
    [...document.getElementsByTagName(tagName)].forEach(element => handler(element))
}

function updateStatusBar(text) {
    document.getElementById("status-text").innerHTML = text
}

function statusOnMouseOver(element, text) {
    element.onmouseover = () => updateStatusBar(text)
    element.onmouseout = () => updateStatusBar("")
}

function searchElementsWithAttributeValue(value) {
    // Based on https://stackoverflow.com/a/30840550 (JQuery selector using value, but unknown attribute)
    const elements = document.getElementsByTagName("*")
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
        changeBlockedContentInfoVisibility(false)
        electron.ipcRenderer.send(ipc.messages.allContentUnblocked)
    }
}

function unblockAll() {
    for (const url in _blockedElements) {
        unblockURL(url)
    }
}

function changeBlockedContentInfoVisibility(isVisible) {
    const infoElement = document.getElementById("blocked-content-info")
    infoElement.hidden = !isVisible
    document.body.style.marginTop = isVisible ? window.getComputedStyle(infoElement).height : 0
}

function switchRawView(isRawView) {
    document.getElementById("content").style.display = isRawView ? "none" : "block"
    document.getElementById("raw-text").style.display = isRawView ? "block" : "none"
    updateStatusBar(isRawView ? "Raw text (leve with Ctrl+U)" : "")
    changeBlockedContentInfoVisibility(!isRawView && hasBlockedElements())
}

function alterStyleURLs(documentDirectory, fileContent) {
    const pattern = /url\(["'](?<url>.*?)["']\)/
    let isInStyle = false
    let isInCode = false
    const lines = fileContent.split(/\r?\n/)
    const lineCount = lines.length
    for (let i = 0; i < lineCount; i++) {
        const line = lines[i].trim()
        if (line === "<style>") {
            isInStyle = true
        } else if (line === "</style>") {
            isInStyle = false
        } else if (line.startsWith("```")) {
            isInCode = !isInCode
        }
        if (isInStyle && !isInCode) {
            const url = line
                .match(pattern)
                ?.groups
                .url
            if (!url || common.isWebURL(url)) {
                continue
            }
            lines[i] = line.replace(
                pattern,
                `url("${path.join(documentDirectory, url).replace(/\\/g, "/")}")`)
        }
    }
    return lines.join("\n")
}

function fittingTarget(target, nodeName) {
    if (!target) {
        return null
    }
    if (target.nodeName === nodeName) {
        return target
    }
    return fittingTarget(target.parentNode, nodeName)
}

document.addEventListener("DOMContentLoaded", () => {
    document.title = TITLE
    electron.ipcRenderer.send(ipc.messages.finishLoad)
})

electron.ipcRenderer.on("fileOpen", (_, filePath, internalTarget, encoding) => {
    changeBlockedContentInfoVisibility(false)

    let content = file.open(filePath, encoding)
    if (!file.isMarkdown(filePath)) {
        const pathParts = filePath.split(".")
        const language = pathParts.length > 1 ? pathParts[pathParts.length - 1] : ""
        content = "```" + language + "\n" + content + "\n```"
        electron.ipcRenderer.send(ipc.messages.disableRawView)
    }

    // URLs in cotaining style definitions have to be altered before rendering
    const documentDirectory = path.resolve(path.dirname(filePath))
    content = alterStyleURLs(documentDirectory, content)

    document.getElementById("content").innerHTML = documentRendering.renderContent(content)
    document.getElementById("raw-text").innerHTML = documentRendering.renderRawText(content)

    // Alter local references to be relativ to the document
    alterTags("a", link => {
        const target = link.getAttribute("href")
        if (target) {
            const fullPath = path.join(documentDirectory, target)
            link.onclick = event => {
                event.preventDefault()
                if (common.isWebURL(target) || target.startsWith("mailto:")) {
                    electron.shell.openExternal(target)
                } else if (isInternalLink(target)) {
                    electron.ipcRenderer.send(ipc.messages.openInternal, target)
                } else if (!file.isMarkdown(fullPath) && !file.isText(fullPath)) {
                    electron.shell.openItem(fullPath)
                } else {
                    electron.ipcRenderer.send(ipc.messages.openFile, fullPath)
                }
            }
            statusOnMouseOver(link, target)
        }
    })
    alterTags("img", image => {
        const imageUrl = image.getAttribute("src")
        if (!common.isWebURL(imageUrl)) {
            image.src = path.join(documentDirectory, imageUrl)
        }
        statusOnMouseOver(image, `${image.getAttribute("alt")} (${imageUrl})`)

        image.onerror = () => image.style.backgroundColor = "#ffe6cc"
    })

    let titlePrefix = filePath
    if (internalTarget) {
        const targetElement = document.getElementById(internalTarget.substring(1))
        if (targetElement) {
            window.scrollTo(0, targetElement.getBoundingClientRect().top)
            titlePrefix += internalTarget
        } else {
            titlePrefix += ` ("${internalTarget}" not found)`
        }
    }
    document.title = `${titlePrefix} - ${TITLE} ${remote.app.getVersion()}`

    window.addEventListener("contextmenu", event => {
        const MenuItem = remote.MenuItem
        const menu = new remote.Menu()

        if (window.getSelection().toString()) {
            menu.append(new MenuItem({
                label: "Copy selection",
                role: "copy"
            }))
        }

        const target = fittingTarget(event.target, "A")
        if (target) {
            menu.append(new MenuItem({
                label: "Copy link text",
                click() {
                    electron.clipboard.writeText(target.innerText)
                }
            }))
            menu.append(new MenuItem({
                label: "Copy link target",
                click() {
                    electron.clipboard.writeText(target.getAttribute("href"))
                }
            }))
        }

        if (menu.items.length > 0) {
            menu.popup({
                window: remote.getCurrentWindow(),
            })
        }
    })
})

electron.ipcRenderer.on("contentBlocked", (_, url) => {
    const elements = _blockedElements[url] = searchElementsWithAttributeValue(url)
    elements.forEach(element => element.onclick = () => unblockURL(url))

    changeBlockedContentInfoVisibility(true)
    document.getElementById("blocked-content-info-text-container").onclick = unblockAll
    document.getElementById("blocked-content-info-close-button").onclick = () => changeBlockedContentInfoVisibility(false)
})

electron.ipcRenderer.on(ipc.messages.unblockAll, unblockAll)

electron.ipcRenderer.on(ipc.messages.viewRawText, () => switchRawView(true))

electron.ipcRenderer.on(ipc.messages.leaveRawText, () => switchRawView(false))

electron.ipcRenderer.on(ipc.messages.prepareReload, (_, isFileModification, encoding) =>
    electron.ipcRenderer.send(
        "reload-prepared",
        isFileModification,
        encoding,
        document.documentElement.scrollTop))

electron.ipcRenderer.on(ipc.messages.restorePosition, (_, position) => {
    window.scrollTo(0, position)
    _scrollPosition = position
})
