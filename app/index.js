"use strict"

const fs = require("fs")
const path = require("path")

const electron = require("electron")
const remote = require("@electron/remote")

const common = require("./lib/common")
const contentBlocking = require("./lib/contentBlocking/contentBlockingRenderer")
const documentRendering = require("./lib/documentRendering/documentRenderingRenderer")
const encodingLib = require("./lib/encoding/encodingRenderer")
const error = require("./lib/error/errorRenderer")
const file = require("./lib/file")
const ipc = require("./lib/ipc/ipcRenderer")
const log = require("./lib/log/log")
const navigation = require("./lib/navigation/navigationRenderer")
const rawText = require("./lib/rawText/rawTextRenderer")
const renderer = require("./lib/renderer/common")
const search = require("./lib/search/searchRenderer")
const toc = require("./lib/toc/tocRenderer")

const TITLE = "Markdown Viewer"
const MERMAID_MODULE_PATH = "../node_modules/mermaid/dist/mermaid.js"

// Needed for theme switching
let _hasMermaid = false

function alterTags(tagName, handler) {
    ;[...document.getElementsByTagName(tagName)].forEach(handler)
}

function updateStatusBar(text) {
    document.getElementById("status-text").innerText = text
}

function clearStatusBar() {
    updateStatusBar("")
}

function statusOnMouseOver(element, text) {
    element.onmouseover = () => updateStatusBar(text)
    element.onmouseout = () => clearStatusBar()
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
                `url("${path.join(documentDirectory, url).replace(/\\/g, "/")}")`,
            )
        }
    }
    return lines.join("\n")
}

function fittingTarget(target, nodePattern) {
    if (!target) {
        return null
    }
    if (target.nodeName.toLowerCase().match(nodePattern)) {
        return target
    }
    return fittingTarget(target.parentNode, nodePattern)
}

function isInContainer(element, containerId) {
    while (element) {
        if (element.id === containerId) {
            return true
        }
        element = element.parentNode
    }
    return false
}

function chooseTheme(isDark) {
    return isDark ? common.DARK_THEME : common.LIGHT_THEME
}

function reload(isFileModification, encoding) {
    ipc.send(
        ipc.messages.reloadPrepared,
        isFileModification,
        encoding,
        renderer.contentElement().scrollTop,
    )
}

function isDataUrl(url) {
    return url.startsWith("data:")
}

function populateToc(content, tocElementId) {
    const rootSection = toc.build(content)
    document.getElementById(tocElementId).innerHTML = rootSection.toHtml()
    for (const section of rootSection.flattenTree()) {
        const expandButtonElement = document.getElementById(section.buttonHtmlId)
        if (section.hasSubSections) {
            expandButtonElement.onclick = () => toc.handleExpandButtonClick(section)
        } else {
            expandButtonElement.style.display = "none"
        }
    }
}

function transformRelativePath(documentDirectory, filePath) {
    return path.join(documentDirectory, filePath).replace("#", "%23")
}

function isLocalPath(url) {
    return !common.isWebURL(url) && !isDataUrl(url)
}

function hasMermaid(content) {
    return (_hasMermaid = content.includes("```mermaid"))
}

function toCodeView(filePath, content) {
    const pathParts = filePath.split(".")
    const language = pathParts.length > 1 ? pathParts.at(-1) : ""

    // If a Markdown file has to be rendered as source code, the code block enclosings
    // ``` have to be escaped. Unicode has an invisible separator character U+2063 that
    // fits this purpose.
    return `\`\`\`${language}\n${content.replaceAll("```", "\u2063```")}\n\`\`\``
}

function isDarkMode() {
    return Boolean(matchMedia("(prefers-color-scheme: dark)").matches)
}

function dropHandler(event) {
    event.preventDefault()

    const filePath = event.dataTransfer.files[0].path
    const fileStat = fs.statSync(filePath)

    if (fileStat.isDirectory()) {
        error.show(`Cannot display: "${filePath}" is a directory`)
    } else if (!fileStat.isFile()) {
        error.show(`Cannot display: "${filePath}" is not a valid file`)
        return
    } else if (!file.isText(filePath)) {
        error.show(`Cannot display: "${filePath}" is not a text file`)
    } else {
        navigation.openFile(filePath, false)
    }
}

function domContentLoadedHandler() {
    document.title = TITLE

    ipc.init()
    log.init()
    renderer.init(document)
    toc.init(document, false)
    contentBlocking.init(document, window)
    rawText.init(() => reload(false))
    navigation.init()
    search.init(document, () => reload(false))
    error.init(document)

    // Based on https://davidwalsh.name/detect-system-theme-preference-change-using-javascript
    const match = matchMedia("(prefers-color-scheme: dark)")
    match.addEventListener("change", event => {
        toc.updateTheme(chooseTheme(Boolean(event.matches)))
        if (_hasMermaid) {
            reload(false)
        }
    })
    toc.updateTheme(chooseTheme(Boolean(match.matches)))

    document.body.ondragover = event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
    }
    document.body.ondrop = dropHandler

    ipc.send(ipc.messages.finishLoad)
}

function contextMenuHandler(event) {
    event.preventDefault()

    const toClipboard = electron.clipboard.writeText
    const MenuItem = remote.MenuItem
    const menu = new remote.Menu()

    if (getSelection().toString()) {
        menu.append(
            new MenuItem({
                label: "Copy selection",
                role: "copy",
            }),
        )
    }

    const target = event.target
    const headerElement = fittingTarget(target, /h\d/)
    if (headerElement) {
        menu.append(
            new MenuItem({
                label: "Copy header anchor",
                click() {
                    toClipboard(headerElement.getAttribute("id"))
                },
            }),
        )
    }

    const linkElement = fittingTarget(target, /a/)
    if (linkElement) {
        menu.append(
            new MenuItem({
                label: "Copy link text",
                click() {
                    toClipboard(linkElement.innerText)
                },
            }),
        )
        menu.append(
            new MenuItem({
                label: "Copy link target",
                click() {
                    toClipboard(linkElement.getAttribute("href"))
                },
            }),
        )
    }

    if (menu.items.length > 0) {
        menu.popup({
            window: remote.getCurrentWindow(),
        })
    }
}

document.addEventListener("DOMContentLoaded", domContentLoadedHandler)

onkeydown = event => {
    switch (event.key) {
        case "Escape":
            if (search.isActive()) {
                search.deactivate()
            } else if (error.isOpen()) {
                error.close()
            } else {
                ipc.send(ipc.messages.closeApplication)
            }
            return
        case "Backspace":
            if (!search.dialogIsOpen()) {
                event.preventDefault()
                navigation.back()
            }
            return
    }
}

ipc.listen(ipc.messages.fileOpen, async file => {
    // Needed for testing
    document.getElementById("loading-indicator").innerHTML = ""

    contentBlocking.changeInfoElementVisiblity(false)
    clearStatusBar()
    toc.reset()

    const filePath = file.path
    const buffer = fs.readFileSync(filePath)
    let encoding = file.encoding
    if (!encoding) {
        encoding = encodingLib.detect(buffer)
        ipc.send(ipc.messages.changeEncoding, filePath, encoding)
    }
    let content = encodingLib.decode(buffer, encoding)

    if (!documentRendering.shallRenderAsMarkdown()) {
        content = toCodeView(filePath, content)
        ipc.send(ipc.messages.disableRawView)
    } else {
        ipc.send(ipc.messages.enableRawView)
    }

    if (rawText.isInRawView()) {
        content = toCodeView(filePath, content)
        updateStatusBar(rawText.MESSAGE)
    }

    // URLs in cotaining style definitions have to be altered before rendering
    const documentDirectory = path.resolve(path.dirname(filePath))
    content = alterStyleURLs(documentDirectory, content)

    renderer.contentElement().innerHTML = documentRendering.renderContent(content)
    if (!documentRendering.shallRenderAsMarkdown() || rawText.isInRawView()) {
        toc.overrideSettings(true)
        toc.setVisibility(false)
    } else {
        toc.setVisibility(toc.getVisibility())
        populateToc(content, "toc")
    }

    // Alter local references to be relativ to the document
    alterTags("a", link => {
        const target = link.getAttribute("href")
        if (target) {
            navigation.registerLink(link, target, documentDirectory)
            statusOnMouseOver(link, target)
        }
    })
    alterTags("img", image => {
        const imageUrl = image.getAttribute("src")
        if (isLocalPath(imageUrl) && isInContainer(image, "content-body")) {
            image.src = transformRelativePath(documentDirectory, imageUrl)
        }
        statusOnMouseOver(image, `${image.getAttribute("alt")} (${imageUrl})`)

        image.onerror = () => (image.style.backgroundColor = "#ffe6cc")
    })
    alterTags("audio", audioElement => {
        const audioUrl = audioElement.getAttribute("src")
        if (audioUrl && isLocalPath(audioUrl)) {
            audioElement.src = transformRelativePath(documentDirectory, audioUrl)
        }
    })
    alterTags("source", source => {
        const url = source.getAttribute("src")
        if (isLocalPath(url)) {
            source.src = transformRelativePath(documentDirectory, url)
        }
    })

    search.highlightTerm()

    const scrollPosition = file.scrollPosition
    const internalTarget = file.internalTarget
    let titlePrefix = filePath
    if (search.isActive()) {
        search.scrollToResult()
    } else {
        if (scrollPosition) {
            renderer.scrollTo(scrollPosition)
        }
        if (internalTarget) {
            const targetElement = document.getElementById(internalTarget.replace("#", ""))
            if (targetElement) {
                if (!scrollPosition) {
                    renderer.scrollTo(renderer.elementYPosition(targetElement))
                }
                titlePrefix += internalTarget
            } else {
                titlePrefix += ` ("${internalTarget}" not found)`
            }
        }
        if (!scrollPosition && !internalTarget) {
            renderer.scrollTo(0)
        }
    }
    document.title = `${titlePrefix} - ${TITLE} ${remote.app.getVersion()}`

    addEventListener("contextmenu", contextMenuHandler)
    if (hasMermaid(content)) {
        await import(MERMAID_MODULE_PATH)

        // eslint-disable-next-line no-undef
        mermaid.initialize({ theme: isDarkMode() ? "dark" : "default" })

        // eslint-disable-next-line no-undef
        mermaid.run()
    }
    renderer.contentElement().focus()

    // Needed for testing
    document.getElementById("loading-indicator").innerHTML = '<div id="loaded"></div>'
})

ipc.listen(ipc.messages.prepareReload, reload)

ipc.listen(ipc.messages.restorePosition, position => {
    if (!search.isActive()) {
        renderer.scrollTo(position)
    }
})

ipc.listen(ipc.messages.changeZoom, zoomFactor => electron.webFrame.setZoomFactor(zoomFactor))

ipc.listen(ipc.messages.changeRenderingOptions, options => {
    documentRendering.reset(options)
    reload(false)
})

ipc.listen(ipc.messages.print, () => {
    const scrollPosition = renderer.contentElement().scrollTop

    toc.overrideSettings(true)
    const tocIsVisible = toc.getVisibility()
    if (tocIsVisible) {
        toc.setVisibility(false)
    }

    print()

    if (tocIsVisible) {
        toc.setVisibility(true)
    }
    toc.overrideSettings(false)

    renderer.scrollTo(scrollPosition)
})

ipc.listen(ipc.messages.showErrorDialog, error.show)
