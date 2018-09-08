const electron = require("electron")
const path = require("path")
const fs = require("fs")
const hljs = require("highlight.js")

const markdown = require("markdown-it")({
    highlight: (text, language) => {
        // Originated from VS Code
        // File extensions/markdown-language-features/src/markdownEngine.ts
        // Commit ID: 3fbfccad359e278a4fbde106328b2b8e2e2242a7
        if (language && hljs.getLanguage(language)) {
            try {
                return `<pre class="hljs"><code><div>${hljs.highlight(language, text, true).value}</div></code></pre>`
            } catch (err) {
                console.log(`Error at highlighting: ${err}`)
            }
        }
        return `<pre class="hljs"><code><div>${markdown.utils.escapeHtml(text)}</div></code></pre>`
    },
    xhtmlOut: true,
    html: true
})
markdown.use(require("markdown-it-headinganchor"), {
    slugify: text =>
        text
            .replace(/\[|\]|<.*>|\(.*\)|\.|`|\{|\}/g, "")
            .trim()
            .replace(/\s/g, "-")
            .toLowerCase()
})

const common = require("./lib/common")

const TITLE = "Markdown Viewer"

const _blockedElements = {}

const isInternalLink = url => url.startsWith("#")

const isMarkdownFile = filePath =>
    common.FILE_EXTENSIONS
        .map(ext => "." + ext)
        .some(ext => filePath.endsWith(ext))

function readBytesSync(filePath, filePosition, numBytesToRead) {
    // Based on https://stackoverflow.com/a/51033457
    const buffer = Buffer.alloc(numBytesToRead, 0)
    let fd
    let bytesRead = 0
    try {
        fd = fs.openSync(filePath, "r")
        bytesRead = fs.readSync(fd, buffer, 0, numBytesToRead, filePosition)
    } finally {
        if (fd) {
            fs.closeSync(fd)
        }
    }
    return {
        bytesRead: bytesRead,
        buffer: buffer
    }
}

function isTextFile(filePath) {
    const BYTECOUNT = 50000
    let data
    try {
        data = readBytesSync(filePath, 0, BYTECOUNT)
    } catch (err) {
        console.log(err.message)
        return false
    }

    // It is not expected that an ASCII file contains control characters.
    // Space character is the first printable ASCII character.
    // Line breaks (LF = 10, CR = 13) and tabs (TAB = 9) are common in text files.
    return data.buffer
        .slice(0, data.bytesRead - 1)
        .every(byte =>
            byte >= 32 ||
            [10, 13, 9].includes(byte))
}

const alterTags = (tagName, handler) =>
    [...document.getElementsByTagName(tagName)].forEach(element => handler(element))

function setStatusBar(element, text) {
    const statusTextElement = document.getElementById("status-text")
    const parentElement = element.parentNode
    parentElement.onmouseover = event => {
        if (event.target.tagName === element.tagName) {
            statusTextElement.innerHTML = text
        }
    }
    parentElement.onmouseout = event => {
        if (event.target.tagName === element.tagName) {
            statusTextElement.innerHTML = ""
        }
    }
}

function searchElementsWithAttributeValue(value) {
    // Based on https://stackoverflow.com/a/30840550
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

function unblockURL(url) {
    electron.ipcRenderer.send("unblockURL", url)

    const elements = _blockedElements[url]
    if (elements) {
        elements.forEach(element => {
            element.removeAttribute("style")
            element.outerHTML = element.outerHTML
        })
        delete _blockedElements[url]
    }

    if (common.isEmptyObject(_blockedElements)) {
        changeBlockedContentInfoVisibility(false)
    }
}

function changeBlockedContentInfoVisibility(isVisible) {
    const infoElement = document.getElementById("blocked-content-info")
    infoElement.hidden = !isVisible
    document.body.style.marginTop = isVisible ? window.getComputedStyle(infoElement).height : 0
}

document.addEventListener("DOMContentLoaded", () => {
    document.title = TITLE
    electron.ipcRenderer.send("finishLoad")
})

electron.ipcRenderer.on("fileOpen", (event, filePath, internalTarget) => {
    changeBlockedContentInfoVisibility(false)

    let content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, '')
    if (!isMarkdownFile(filePath)) {
        const pathParts = filePath.split(".")
        const language = pathParts.length > 1 ? pathParts[pathParts.length - 1] : ""
        content = "```" + language + "\n" + content + "\n```"
    }
    document.getElementById("content").innerHTML = markdown.render(content)

    const documentDirectory = path.dirname(filePath)
    alterTags("a", link => {
        const target = link.getAttribute("href")
        const fullPath = path.join(documentDirectory, target)
        link.onclick = event => {
            event.preventDefault()
            if (common.isWebURL(target) || target.startsWith("mailto:")) {
                electron.shell.openExternal(target)
            } else if (isInternalLink(target)) {
                electron.ipcRenderer.send("openInternal", target)
            } else if (!isMarkdownFile(fullPath) && !isTextFile(fullPath)) {
                electron.shell.openItem(fullPath)
            } else {
                electron.ipcRenderer.send("openFile", fullPath)
            }
        }
        setStatusBar(link, target)
    })
    alterTags("img", image => {
        const imageUrl = image.getAttribute("src")
        if (!common.isWebURL(imageUrl)) {
            image.src = path.join(documentDirectory, imageUrl)
        }
        setStatusBar(image, `${image.getAttribute("alt")} (${imageUrl})`)

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
    document.title = `${titlePrefix} - ${TITLE} ${electron.remote.app.getVersion()}`

    window.addEventListener("contextmenu", event => {
        const MenuItem = electron.remote.MenuItem
        const menu = new electron.remote.Menu()

        if (window.getSelection().toString()) {
            menu.append(new MenuItem({
                label: "Copy selection",
                role: "copy"
            }))
        }
        if (event.target.nodeName == "A") {
            menu.append(new MenuItem({
                label: "Copy link text",
                click() {
                    electron.clipboard.writeText(event.target.innerText)
                }
            }))
            menu.append(new MenuItem({
                label: "Copy link target",
                click() {
                    electron.clipboard.writeText(event.target.getAttribute("href"))
                }
            }))
        }

        if (menu.items.length > 0) {
            menu.popup({ window: electron.remote.getCurrentWindow() })
        }
    })
})

electron.ipcRenderer.on("contentBlocked", (event, url) => {
    const elements = _blockedElements[url] = searchElementsWithAttributeValue(url)
    elements.forEach(element => element.onclick = () => unblockURL(url))

    changeBlockedContentInfoVisibility(true)
    document.getElementById("blocked-content-info-text-container").onclick = () => {
        for (let url in _blockedElements) {
            unblockURL(url)
        }
    }
    document.getElementById("blocked-content-info-close-button").onclick = () =>
        changeBlockedContentInfoVisibility(false)
})
