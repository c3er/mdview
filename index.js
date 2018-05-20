const { ipcRenderer, shell } = require("electron")
const path = require("path")
const fs = require("fs")
const hljs = require("highlight.js")

const TITLE = "Markdown Viewer"

const isInternetUrl = url => url.includes("://") || url.startsWith("mailto:")

const renderRawText = text => `<pre class="hljs"><code><div>${markdown.utils.escapeHtml(text)}</div></code></pre>`

function alterTags(tagName, handler) {
    const tagElements = document.getElementsByTagName(tagName)
    for (let i = 0; i < tagElements.length; i++) {
        handler(tagElements[i])
    }
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
        return renderRawText(text)
    },
    xhtmlOut: true,
    html: true
})

document.addEventListener("DOMContentLoaded", () => {
    document.title = TITLE
    ipcRenderer.send("finishLoad")
})

ipcRenderer.on("fileOpen", (event, filePath, isMarkdownFile) => {
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
                shell.openExternal(target)
            } else {
                ipcRenderer.send("openFile", path.join(documentDirectory, target))
            }
            event.preventDefault()
        })
    })
    alterTags("img", image => {
        const imageUrl = image.getAttribute("src")
        console.log(imageUrl)
        if (!isInternetUrl(imageUrl)) {
            image.src = path.join(documentDirectory, imageUrl)
            console.log(documentDirectory)
            console.log(image.src)
        }
    })

    document.title = `${filePath} - ${TITLE}`
})
