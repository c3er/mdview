const fs = require("fs")
const path = require("path")

const electron = require("electron")
const hljs = require("highlight.js")

const markdown = require("markdown-it")({
    highlight: (text, language) => {
        // Originated from VS Code
        // File extensions/markdown-language-features/src/markdownEngine.ts
        // Commit ID: 3fbfccad359e278a4fbde106328b2b8e2e2242a7
        if (language && hljs.getLanguage(language)) {
            try {
                return generateCodeText(hljs.highlight(language, text, true).value, { isHighlighted: true })
            } catch (err) {
                console.log(`Error at highlighting: ${err}`)
            }
        }
        return generateCodeText(markdown.utils.escapeHtml(text), { isHighlighted: true })
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
const file = require("./lib/file")

const TITLE = "Markdown Viewer"

const _blockedElements = {}

let _scrollPosition = 0

function generateCodeText(text, options = {}) {
    const defaults = {
        isHighlighted: false,
        isMdRawText: false
    }
    const actual = Object.assign({}, defaults, options)

    const hljsClass = actual.isHighlighted ? "hljs" : ""
    const mdRawClass = actual.isMdRawText ? "md-raw" : ""

    const preClass = actual.isHighlighted || actual.isMdRawText
        ? ` class="${[hljsClass, mdRawClass].join(" ")}"`
        : ""
    return `<pre${preClass}"><code><div>${text}</div></code></pre>`
}

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

function unblockURL(url) {
    electron.ipcRenderer.send("unblockURL", url)

    const elements = _blockedElements[url]
    if (elements) {
        elements.forEach(element => {
            element.removeAttribute("style")

            // Force element to reload without recreating the DOM element.
            // The attached event handlers would be lost while recreating the DOM element.
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

    if (common.isEmptyObject(_blockedElements)) {
        changeBlockedContentInfoVisibility(false)
        electron.ipcRenderer.send("allContentUnblocked")
    }
}

function unblockAll() {
    for (let url in _blockedElements) {
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
    updateStatusBar(isRawView ? "Raw text (leave with Escape key)" : "")
    changeBlockedContentInfoVisibility(!isRawView)
}

document.addEventListener("DOMContentLoaded", () => {
    document.title = TITLE
    electron.ipcRenderer.send("finishLoad")
})

window.addEventListener('keyup', event => {
    if (event.key === "Escape") {
        event.preventDefault()
        switchRawView(false)
        changeBlockedContentInfoVisibility(!common.isEmptyObject(_blockedElements))
        electron.ipcRenderer.send("enableRawView")
    }
})

electron.ipcRenderer.on("fileOpen", (_, filePath, internalTarget) => {
    changeBlockedContentInfoVisibility(false)

    let content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, '')
    if (!file.isMarkdown(filePath)) {
        const pathParts = filePath.split(".")
        const language = pathParts.length > 1 ? pathParts[pathParts.length - 1] : ""
        content = "```" + language + "\n" + content + "\n```"
        electron.ipcRenderer.send("disableRawView")
    }
    document.getElementById("content").innerHTML = markdown.render(content)
    document.getElementById("raw-text").innerHTML = generateCodeText(markdown.utils.escapeHtml(content), {
        isMdRawText: true,
    })

    // Alter local references to be relativ to the document
    const documentDirectory = path.dirname(filePath)
    alterTags("a", link => {
        const target = link.getAttribute("href")
        if (target) {
            const fullPath = path.join(documentDirectory, target)
            link.onclick = event => {
                event.preventDefault()
                if (common.isWebURL(target) || target.startsWith("mailto:")) {
                    electron.shell.openExternal(target)
                } else if (isInternalLink(target)) {
                    electron.ipcRenderer.send("openInternal", target)
                } else if (!file.isMarkdown(fullPath) && !file.isText(fullPath)) {
                    electron.shell.openItem(fullPath)
                } else {
                    electron.ipcRenderer.send("openFile", fullPath)
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
        image.onload = () => window.scrollTo(0, _scrollPosition)
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
        if (event.target.nodeName === "A") {
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
            menu.popup({
                window: electron.remote.getCurrentWindow(),
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

electron.ipcRenderer.on("unblockAll", unblockAll)

electron.ipcRenderer.on("viewRawText", () => switchRawView(true))

electron.ipcRenderer.on("prepareReload", (_, isFileModification) =>
    electron.ipcRenderer.send("reloadPrepared", isFileModification, document.documentElement.scrollTop))

electron.ipcRenderer.on("restorePosition", (_, position) => {
    window.scrollTo(0, position)
    _scrollPosition = position
})
