const electron = require("electron")
const path = require("path")
const fs = require("fs")
const hljs = require("highlight.js")

const TITLE = "Markdown Viewer"

const isInternetUrl = url => url.includes("://") || url.startsWith("mailto:")

const isInternalLink = url => url.startsWith("#")

function alterTags(tagName, handler) {
    const tagElements = document.getElementsByTagName(tagName)
    for (let i = 0; i < tagElements.length; i++) {
        handler(tagElements[i])
    }
}

function setStatusBar(element, text) {
    const statusTextElement = document.getElementById("status-text")
    element.addEventListener("mouseover", () => statusTextElement.innerHTML = text)
    element.addEventListener("mouseout", () => statusTextElement.innerHTML = "")
}

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
    slugify: text => {
        return text
            .replace(/(\[.*\]|<.*>|\(.*\)|\.|`)/g, "")
            .trim()
            .replace(/\s/g, "-")
            .toLowerCase()
    }
})

document.addEventListener("DOMContentLoaded", () => {
    document.title = TITLE
    electron.ipcRenderer.send("finishLoad")
})

electron.ipcRenderer.on("fileOpen", (event, filePath, isMarkdownFile, internalTarget) => {
    const documentDirectory = path.dirname(filePath)

    let content = fs.readFileSync(filePath, "utf8")
    if (!isMarkdownFile) {
        content = "```\n" + content + "\n```"
    }
    document.getElementById("content").innerHTML = markdown.render(content)

    alterTags("a", link => {
        const target = link.getAttribute("href")
        link.addEventListener("click", event => {
            if (isInternetUrl(target)) {
                electron.shell.openExternal(target)
            } else if (isInternalLink(target)) {
                electron.ipcRenderer.send("openInternal", target)
            } else {
                electron.ipcRenderer.send("openFile", path.join(documentDirectory, target))
            }
            event.preventDefault()
        })
        setStatusBar(link, target)
    })
    alterTags("img", image => {
        const imageUrl = image.getAttribute("src")
        if (!isInternetUrl(imageUrl)) {
            image.src = path.join(documentDirectory, imageUrl)
        }
        setStatusBar(image, `${image.getAttribute("alt")} (${imageUrl})`)
    })

    let titlePrefix = filePath
    if (internalTarget) {
        window.scrollTo(0, document.getElementById(internalTarget.substring(1)).getBoundingClientRect().top)
        titlePrefix += internalTarget
    }

    document.title = `${titlePrefix} - ${TITLE}`
})
