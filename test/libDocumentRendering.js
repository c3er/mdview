const assert = require("chai").assert
const lodashClonedeep = require("lodash.clonedeep")

const documentRendering = require("../app/lib/documentRendering/documentRenderingRenderer")

describe("Document rendering", () => {
    const defaultOptions = {
        lineBreaksEnabled: false,
        typographyEnabled: true,
        emojisEnabled: true,
        renderAsMarkdown: true,
    }
    const headerText = "This is a test"
    const mdHeader = `# ${headerText}`

    beforeEach(() => documentRendering.reset(defaultOptions))

    it("renders a header", () => {
        assert.isTrue(
            new RegExp(`<h1.*>${headerText}</h1>`).test(documentRendering.renderContent(mdHeader))
        )
    })

    describe("Raw text", () => {
        let actual

        before(() => (actual = documentRendering.renderRawText(mdHeader)))

        it("is inside a <pre>...</pre> statement", () => {
            assert.isTrue(/<pre.*>.*<\/pre>/.test(actual))
        })

        it("does not change the input", () => {
            assert.include(actual, mdHeader)
        })
    })

    describe("Render as Markdown", () => {
        it("is active after enabling the option", () => {
            assert.isTrue(documentRendering.shallRenderAsMarkdown())
        })

        it("is inactive after disabling the option", () => {
            const options = lodashClonedeep(defaultOptions)
            options.renderAsMarkdown = false
            documentRendering.reset(options)

            assert.isFalse(documentRendering.shallRenderAsMarkdown())
        })
    })
})
