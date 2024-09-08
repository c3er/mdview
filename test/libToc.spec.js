const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

const documentRendering = require("../app/lib/documentRenderingRenderer")
const toc = require("../app/lib/tocRenderer")

function assertSections(content, rootSection) {
    content = lib.prepareMdContent(content)
    documentRendering.renderContent(content)
    const actual = toc.build(content)
    const expected = toc.fromObject(rootSection)
    assert(
        actual.equals(expected),
        `\nExpected:\n${expected.toJson()}\n\nActual:\n${actual.toJson()}`,
    )
}

describe("Table of Contents", () => {
    describe("Renderer part", () => {
        beforeEach(() => {
            toc.init(mocking.document, true)
            documentRendering.reset({
                lineBreaksEnabled: false,
                typographyEnabled: false,
                emojisEnabled: false,
                renderAsMarkdown: false,
            })
        })

        it("recognizes a header", () => {
            assertSections("# Some header", {
                subSections: [{ header: "Some header" }],
            })
        })

        it("recognizes two headers", () => {
            assertSections(
                `
                    # Header 1
                    # Header 2
                `,
                {
                    subSections: [
                        {
                            header: "Header 1",
                        },
                        {
                            header: "Header 2",
                        },
                    ],
                },
            )
        })

        it("recognizes a section with sub section", () => {
            assertSections(
                `
                    # Main section
                    ## Sub section
                `,
                {
                    subSections: [
                        {
                            header: "Main section",
                            subSections: [
                                {
                                    header: "Sub section",
                                },
                            ],
                        },
                    ],
                },
            )
        })

        it("recognizes a higher section after sub section", () => {
            assertSections(
                `
                    # Main section 1
                    ## Sub section
                    # Main section 2
                `,
                {
                    subSections: [
                        {
                            header: "Main section 1",
                            subSections: [
                                {
                                    header: "Sub section",
                                },
                            ],
                        },
                        {
                            header: "Main section 2",
                        },
                    ],
                },
            )
        })

        it("indents only one level at finding sub section two levels deeper", () => {
            assertSections(
                `
                    # Main section 1
                    ### Sub section 1
                    ## Sub section 2
                    # Main section 2
                `,
                {
                    subSections: [
                        {
                            header: "Main section 1",
                            subSections: [
                                {
                                    header: "Sub section 1",
                                },
                                {
                                    header: "Sub section 2",
                                },
                            ],
                        },
                        {
                            header: "Main section 2",
                        },
                    ],
                },
            )
        })

        it("recognizes headers with # sign", () => {
            assertSections(
                `
                    # C#
                    # # Header
                `,
                {
                    subSections: [
                        {
                            header: "C#",
                        },
                        {
                            header: "# Header",
                        },
                    ],
                },
            )
        })

        it("recognizes a main section after a sub-sub-section", () => {
            assertSections(
                `
                    # Test 1
                    ## Test 1.1
                    ### Test 1.1.1
                    # Test 2
                `,
                {
                    subSections: [
                        {
                            header: "Test 1",
                            subSections: [
                                {
                                    header: "Test 1.1",
                                    subSections: [
                                        {
                                            header: "Test 1.1.1",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            header: "Test 2",
                        },
                    ],
                },
            )
        })

        it("handles empty headers as expected", () => {
            assertSections(
                `
                    # Title
                    ## Section
                    ##
                `,
                {
                    subSections: [
                        {
                            header: "Title",
                            subSections: [
                                {
                                    header: "Section",
                                },
                                {
                                    header: "",
                                },
                            ],
                        },
                    ],
                },
            )
        })

        it("structures README as expected", () => {
            assertSections(
                `
                    # Markdown Viewer
                    ## Installation and usage
                    ### Windows
                    ## Known issues
                    ### Windows installation and download security
                    ### Startup speed
                    ### Build error ERR_ELECTRON_BUILDER_CANNOT_EXECUTE (development)
                    ## Developing
                    ### Debugging
                    ### Note for Windows
                    ## Copyright and License
                    ## Further notes
                `,
                {
                    subSections: [
                        {
                            header: "Markdown Viewer",
                            subSections: [
                                {
                                    header: "Installation and usage",
                                    subSections: [
                                        {
                                            header: "Windows",
                                        },
                                    ],
                                },
                                {
                                    header: "Known issues",
                                    subSections: [
                                        {
                                            header: "Windows installation and download security",
                                        },
                                        {
                                            header: "Startup speed",
                                        },
                                        {
                                            header: "Build error ERR_ELECTRON_BUILDER_CANNOT_EXECUTE (development)",
                                        },
                                    ],
                                },
                                {
                                    header: "Developing",
                                    subSections: [
                                        {
                                            header: "Debugging",
                                        },
                                        {
                                            header: "Note for Windows",
                                        },
                                    ],
                                },
                                {
                                    header: "Copyright and License",
                                },
                                {
                                    header: "Further notes",
                                },
                            ],
                        },
                    ],
                },
            )
        })
    })
})
