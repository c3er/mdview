const path = require("path")
const fs = require("fs")
const highlight = require("highlight.js")

const markdown = require("markdown-it")({
    highlight: (str, lang) => {
        // Taken from VS Code
        if (lang && highlight.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code><div>${highlight.highlight(lang, str, true).value}</div></code></pre>`
            } catch (err) {
                console.log(`Error at highlighting: ${err}`)
            }
        }
        return `<pre class="hljs"><code><div>${markdown.utils.escapeHtml(str)}</div></code></pre>`
    },
    xhtmlOut: true
})

let content = fs.readFileSync(path.join(__dirname, "testfile.md"), "utf8")
document.getElementById("content").innerHTML = markdown.render(content)
