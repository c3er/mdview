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

function alterTags(tagName, handler) {
    const tagElements = [...document.getElementsByTagName(tagName)]
    for (let i = 0; i < tagElements.length; i++) {
        handler(tagElements[i])
    }
}

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
        elements.forEach(element => element.outerHTML = element.outerHTML)
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

electron.ipcRenderer.on("fileOpen", (event, filePath, isMarkdownFile, internalTarget) => {
    const documentDirectory = path.dirname(filePath)

    let content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, '')
    if (!isMarkdownFile) {
        content = "```\n" + content + "\n```"
    }
    document.getElementById("content").innerHTML = markdown.render(content)

    alterTags("a", link => {
        const target = link.getAttribute("href")
        link.onclick = event => {
            event.preventDefault()
            if (common.isWebURL(target) || target.startsWith("mailto:")) {
                electron.shell.openExternal(target)
            } else if (isInternalLink(target)) {
                electron.ipcRenderer.send("openInternal", target)
            } else {
                electron.ipcRenderer.send("openFile", path.join(documentDirectory, target))
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
    document.title = `${titlePrefix} - ${TITLE}`

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
