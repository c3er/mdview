const assert = require("chai").assert

const documentRendering = require("../app/lib/documentRendering/documentRenderingRenderer")
const toc = require("../app/lib/toc/tocRenderer")

function trimLines(content) {
    return content
        .split("\n")
        .map(line => line.trim())
        .join("\n")
}

function assertSections(content, rootSection) {
    content = trimLines(content)
    documentRendering.renderContent(content)
    assert.isTrue(toc.build(content).equals(toc.Section.fromObject(rootSection)))
}

describe('Library "TOC"', () => {
    describe("Renderer part", () => {
        beforeEach(() => {
            toc.reset()
            documentRendering.reset({
                lineBreaksEnabled: false,
                typographyEnabled: false,
                emojisEnabled: false,
                renderAsMarkdown: false,
            })
        })

        it("recognizes a header", () => {
            assertSections("# Some header", {
                subSections: [
                    {
                        header: "Some header",
                        subSection: [],
                    },
                ],
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
                            subSection: [],
                        },
                        {
                            header: "Header 2",
                            subSection: [],
                        },
                    ],
                }
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
                                    subSections: [],
                                },
                            ],
                        },
                    ],
                }
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
                                    subSections: [],
                                },
                            ],
                        },
                        {
                            header: "Main section 2",
                            subSections: [],
                        },
                    ],
                }
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
                                    subSections: [],
                                },
                                {
                                    header: "Sub section 2",
                                    subSections: [],
                                },
                            ],
                        },
                        {
                            header: "Main section 2",
                            subSections: [],
                        },
                    ],
                }
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
                            subSections: [],
                        },
                        {
                            header: "# Header",
                            subSections: [],
                        },
                    ],
                }
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
                                            subSections: [],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            header: "Test 2",
                            subSections: [],
                        },
                    ],
                }
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
                                            subSections: [],
                                        },
                                    ],
                                },
                                {
                                    header: "Known issues",
                                    subSections: [
                                        {
                                            header: "Windows installation and download security",
                                            subSections: [],
                                        },
                                        {
                                            header: "Startup speed",
                                            subSections: [],
                                        },
                                        {
                                            header: "Build error ERR_ELECTRON_BUILDER_CANNOT_EXECUTE (development)",
                                            subSections: [],
                                        },
                                    ],
                                },
                                {
                                    header: "Developing",
                                    subSections: [
                                        {
                                            header: "Debugging",
                                            subSections: [],
                                        },
                                        {
                                            header: "Note for Windows",
                                            subSections: [],
                                        },
                                    ],
                                },
                                {
                                    header: "Copyright and License",
                                    subSections: [],
                                },
                                {
                                    header: "Further notes",
                                    subSections: [],
                                },
                            ],
                        },
                    ],
                }
            )
        })
    })
})
