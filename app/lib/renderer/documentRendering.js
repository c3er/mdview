const hljs = require("highlight.js")

const markdown = require("markdown-it")({
    highlight: (text, language) => {
        // Originated from VS Code
        // File extensions/markdown-language-features/src/markdownEngine.ts
        // Commit ID: 3fbfccad359e278a4fbde106328b2b8e2e2242a7
        if (language && hljs.getLanguage(language)) {
            try {
                return generateCodeText(
                    hljs.highlight(text, {
                        language: language,
                        ignoreIllegals: true,
                    }).value,
                    { isHighlighted: true }
                )
            } catch (err) {
                console.error(`Error at highlighting: ${err}`)
            }
        }
        return generateCodeText(markdown.utils.escapeHtml(text), { isHighlighted: true })
    },
    xhtmlOut: true,
    html: true,
    linkify: true,
})
markdown.use(require("markdown-it-headinganchor"), {
    slugify: text =>
        text
            .replace(/\[|\]|<.*>|\(.*\)|\.|`|\{|\}/g, "")
            .trim()
            .replace(/\s/g, "-")
            .toLowerCase(),
})
markdown.use(require("markdown-it-new-katex"))
markdown.use(require("markdown-it-emoji"))

function generateCodeText(text, options = {}) {
    const defaults = {
        isHighlighted: false,
        isMdRawText: false,
    }
    const actual = Object.assign({}, defaults, options)

    const hljsClass = actual.isHighlighted ? "hljs" : ""
    const mdRawClass = actual.isMdRawText ? "md-raw" : ""

    const preClass =
        actual.isHighlighted || actual.isMdRawText
            ? ` class="${[hljsClass, mdRawClass].join(" ")}"`
            : ""
    return `<pre${preClass}"><code><div>${text}</div></code></pre>`
}

exports.renderContent = content => markdown.render(content)

exports.renderRawText = content =>
    generateCodeText(markdown.utils.escapeHtml(content), { isMdRawText: true })
