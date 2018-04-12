const { ipcRenderer } = require("electron")
const path = require("path")
const fs = require("fs")
const hljs = require("highlight.js")

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
    xhtmlOut: true
})

ipcRenderer.on("fileOpen", (event, path) => {
    let content = fs.readFileSync(path, "utf8")
    document.getElementById("content").innerHTML = markdown.render(content)
})
