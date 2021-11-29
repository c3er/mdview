const assert = require("chai").assert

const documentRendering = require("../app/lib/documentRendering/documentRenderingRenderer")

describe("Document rendering", () => {
    const headerText = "This is a test"
    const mdHeader = `# ${headerText}`

    before(() =>
        documentRendering.reset({
            lineBreaksEnabled: false,
            typographyEnabled: true,
            emojisEnabled: true,
        })
    )

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
})
