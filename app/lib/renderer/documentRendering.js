const hljs = require("highlight.js")

const metadata = require("./metadata")
const toc = require("../tocRenderer.js")

let _markdown

let _shallRenderAsMarkdown = false
let _shallHideMetadata = false

function generateCodeText(text, options = {}) {
    options = {
        isHighlighted: false,
        ...options,
    }

    const preClass = options.isHighlighted ? `class="${options.isHighlighted ? "hljs" : ""}"` : ""
    return `<pre ${preClass}><code>${text}</code></pre>`
}

exports.reset = options => {
    _markdown = require("markdown-it")({
        highlight(text, language) {
            if (language.toLowerCase() === "mermaid") {
                return `<pre class="mermaid">${text}</pre>`
            }

            // Originated from VS Code
            // File extensions/markdown-language-features/src/markdownEngine.ts
            // Commit ID: 3fbfccad359e278a4fbde106328b2b8e2e2242a7
            if (language && hljs.getLanguage(language)) {
                return generateCodeText(
                    hljs.highlight(text, {
                        language: language,
                        ignoreIllegals: true,
                    }).value,
                    { isHighlighted: true },
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
            rowspan: true,
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
        _markdown.use(require("../../../node_modules/markdown-it-emoji/dist/markdown-it-emoji.js"))
    }

    _shallRenderAsMarkdown = options.renderAsMarkdown
    _shallHideMetadata = options.hideMetadata
}

exports.renderContent = content =>
    _markdown.render(_shallHideMetadata ? metadata.hide(content) : metadata.render(content))

exports.shallRenderAsMarkdown = () => _shallRenderAsMarkdown
