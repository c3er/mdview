const hljs = require("highlight.js")

const toc = require("../toc/tocRenderer")

let _markdown

let _shallRenderAsMarkdown = false

function generateCodeText(text, options = {}) {
    options = Object.assign(
        {},
        {
            isHighlighted: false,
            isMdRawText: false,
        },
        options
    )

    const hljsClass = options.isHighlighted ? "hljs" : ""
    const mdRawClass = options.isMdRawText ? "md-raw" : ""

    const preClass =
        options.isHighlighted || options.isMdRawText
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
                return generateCodeText(
                    hljs.highlight(text, {
                        language: language,
                        ignoreIllegals: true,
                    }).value,
                    { isHighlighted: true }
                )
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
        .use(require("markdown-it-anchor"), {
            callback(_, info) {
                toc.addHeader(info.title, info.slug)
            },
        })
        .use(require("markdown-it-html5-embed"), {
            html5embed: {
                attributes: {
                    audio: "controls",
                    video: 'width="500" controls',
                },
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
        .use(require("markdown-it-task-checkbox"), { disabled: false })

    if (options.emojisEnabled) {
        _markdown.use(require("markdown-it-emoji"))
    }

    _shallRenderAsMarkdown = options.renderAsMarkdown
}

exports.renderContent = content => _markdown.render(content)

exports.renderRawText = content =>
    generateCodeText(_markdown.utils.escapeHtml(content), { isMdRawText: true })

exports.shallRenderAsMarkdown = () => _shallRenderAsMarkdown
