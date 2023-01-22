const assert = require("chai").assert

const toc = require("../app/lib/renderer/toc")

describe('Library "TOC"', () => {
    it("Recognizes a header", () => {
        const headerText = "Some header"
        const content = `# ${headerText}`
        const rootSection = toc.build(content)
        assert.isTrue(
            rootSection.equals(
                toc.Section.fromObject({
                    header: "",
                    parent: null,
                    subSections: [
                        {
                            header: headerText,
                            subSection: [],
                        },
                    ],
                })
            )
        )
    })
})
