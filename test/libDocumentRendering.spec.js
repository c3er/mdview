const assert = require("assert")
const lodashClonedeep = require("lodash.clonedeep")

const documentRendering = require("../app/lib/renderer/documentRendering")

describe("Document rendering", () => {
    const defaultOptions = {
        lineBreaksEnabled: false,
        typographyEnabled: true,
        emojisEnabled: true,
        renderAsMarkdown: true,
        hideMetadata: false,
    }
    const headerText = "This is a test"
    const mdHeader = `# ${headerText}`

    beforeEach(() => documentRendering.reset(defaultOptions))

    it("renders a header", () => {
        assert(
            new RegExp(`<h1.*>${headerText}</h1>`).test(documentRendering.renderContent(mdHeader)),
        )
    })

    describe("Render as Markdown", () => {
        it("is active after enabling the option", () => {
            assert(documentRendering.shallRenderAsMarkdown())
        })

        it("is inactive after disabling the option", () => {
            const options = lodashClonedeep(defaultOptions)
            options.renderAsMarkdown = false
            documentRendering.reset(options)

            assert(!documentRendering.shallRenderAsMarkdown())
        })
    })
})
