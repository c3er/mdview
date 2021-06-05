const assert = require("chai").assert

const documentRendering = require("../app/lib/renderer/documentRendering")

describe("Document rendering", () => {
    const headerText = "This is a test"
    const mdHeader = `# ${headerText}`

    it("renders a header", () => {
        assert.isTrue(
            new RegExp(`<h1.*>${headerText}</h1>`).test(documentRendering.renderContent(mdHeader))
        )
    })

    describe("Raw text", () => {
        const actual = documentRendering.renderRawText(mdHeader)

        it("is inside a <pre>...</pre> statement", () => {
            assert.isTrue(/<pre.*>.*<\/pre>/.test(actual))
        })

        it("does not change the input", () => {
            assert.include(actual, mdHeader)
        })
    })
})
