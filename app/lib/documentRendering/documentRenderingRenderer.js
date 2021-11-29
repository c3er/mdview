const hljs = require("highlight.js")

let _markdown

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
            ? `class="${[hljsClass, mdRawClass].join(" ").trim()}"`
            : ""
    return `<pre ${preClass}><code>${text}</code></pre>`
}

exports.reset = options => {
    _markdown = require("markdown-it")({
        highlight(text, language) {
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
            return generateCodeText(_markdown.utils.escapeHtml(text), { isHighlighted: true })
        },
        xhtmlOut: true,
        html: true,
        linkify: true,
        breaks: options.lineBreaksEnabled,
        typographer: options.typographyEnabled,
    })

    _markdown
        .use(require("markdown-it-headinganchor"), {
            slugify(text) {
                return text
                    .replace(/\[|\]|<.*>|\(.*\)|\.|`|\{|\}/g, "")
                    .trim()
                    .replace(/\s/g, "-")
                    .toLowerCase()
            },
        })
        .use(require("markdown-it-multimd-table"), {
            headerless: true,
            multiline: true,
        })
        .use(require("markdown-it-abbr"))
        .use(require("markdown-it-container"), "error")
        .use(require("markdown-it-container"), "info")
        .use(require("markdown-it-container"), "warning")
        .use(require("markdown-it-footnote"))
        .use(require("markdown-it-mark"))
        .use(require("markdown-it-new-katex"))
        .use(require("markdown-it-sub"))
        .use(require("markdown-it-sup"))

    if (options.emojisEnabled) {
        _markdown.use(require("markdown-it-emoji"))
    }
}

exports.renderContent = content => _markdown.render(content)

exports.renderRawText = content =>
    generateCodeText(_markdown.utils.escapeHtml(content), { isMdRawText: true })
