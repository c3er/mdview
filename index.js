const { ipcRenderer } = require("electron")
const path = require("path")
const fs = require("fs")
const hljs = require("highlight.js")

const TITLE = "Markdown Viewer"

const markdown = require("markdown-it")({
    highlight: (str, lang) => {
        // Taken from VS Code
        // File extensions/markdown-language-features/src/markdownEngine.ts
        // Commit ID: 3fbfccad359e278a4fbde106328b2b8e2e2242a7
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code><div>${hljs.highlight(lang, str, true).value}</div></code></pre>`
            } catch (err) {
                console.log(`Error at highlighting: ${err}`)
            }
        }
        return `<pre class="hljs"><code><div>${markdown.utils.escapeHtml(str)}</div></code></pre>`
    },
    xhtmlOut: true,
    html: true
})

function renderFile(path) {
    let content = fs.readFileSync(path, "utf8")
    document.getElementById("content").innerHTML = markdown.render(content)
    document.title = `${path} - ${TITLE}`
}

ipcRenderer.on("fileOpen", (event, path) => {
    renderFile(path)
    hasFileOpened = true
})

document.addEventListener("DOMContentLoaded", () => {
    document.title = TITLE
    ipcRenderer.send("finishLoad")
})
