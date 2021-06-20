"use strict"

const path = require("path")

const electron = require("electron")
const remote = require("@electron/remote")

const common = require("./lib/common")
const contentBlocking = require("./lib/contentBlocking/contentBlockingRenderer")
const documentRendering = require("./lib/renderer/documentRendering")
const file = require("./lib/file")
const ipc = require("./lib/ipc")
const rawText = require("./lib/rawText/rawTextRenderer")

const TITLE = "Markdown Viewer"

function isInternalLink(url) {
    return url.startsWith("#")
}

function alterTags(tagName, handler) {
    ;[...document.getElementsByTagName(tagName)].forEach(handler)
}

function updateStatusBar(text) {
    document.getElementById("status-text").innerHTML = text
}

function statusOnMouseOver(element, text) {
    element.onmouseover = () => updateStatusBar(text)
    element.onmouseout = () => updateStatusBar("")
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
            const url = line.match(pattern)?.groups.url
            if (!url || common.isWebURL(url)) {
                continue
            }
            lines[i] = line.replace(
                pattern,
                `url("${path.join(documentDirectory, url).replace(/\\/g, "/")}")`
            )
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
    contentBlocking.init(document, window)
    rawText.init(document, window, updateStatusBar)
    electron.ipcRenderer.send(ipc.messages.finishLoad)
})

electron.ipcRenderer.on(ipc.messages.fileOpen, (_, filePath, internalTarget, encoding) => {
    contentBlocking.changeInfoElementVisiblity(false)

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
                    electron.shell.openPath(fullPath)
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

        image.onerror = () => (image.style.backgroundColor = "#ffe6cc")
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
            menu.append(
                new MenuItem({
                    label: "Copy selection",
                    role: "copy",
                })
            )
        }

        const target = fittingTarget(event.target, "A")
        if (target) {
            menu.append(
                new MenuItem({
                    label: "Copy link text",
                    click() {
                        electron.clipboard.writeText(target.innerText)
                    },
                })
            )
            menu.append(
                new MenuItem({
                    label: "Copy link target",
                    click() {
                        electron.clipboard.writeText(target.getAttribute("href"))
                    },
                })
            )
        }

        if (menu.items.length > 0) {
            menu.popup({
                window: remote.getCurrentWindow(),
            })
        }
    })
})

electron.ipcRenderer.on(ipc.messages.prepareReload, (_, isFileModification, encoding) =>
    electron.ipcRenderer.send(
        ipc.messages.reloadPrepared,
        isFileModification,
        encoding,
        document.documentElement.scrollTop
    )
)

electron.ipcRenderer.on(ipc.messages.restorePosition, (_, position) => window.scrollTo(0, position))
