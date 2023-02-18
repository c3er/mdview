const assert = require("chai").assert

const toc = require("../app/lib/renderer/toc")

describe('Library "TOC"', () => {
    it("recognizes a header", () => {
        const content = "# Some header"
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
                    subSections: [
                        {
                            header: "Some header",
                            subSection: [],
                        },
                    ],
                })
            )
        )
    })

    it("recognizes two headers", () => {
        const content = `
            # Header 1
            # Header 2
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
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
                })
            )
        )
    })

    it("recognizes a section with sub section", () => {
        const content = `
            # Main section
            ## Sub section
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
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
                })
            )
        )
    })

    it("recognizes a higher section after sub section", () => {
        const content = `
            # Main section 1
            ## Sub section
            # Main section 2
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
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
                })
            )
        )
    })

    it("indents only one level at finding sub section two levels deeper", () => {
        const content = `
            # Main section 1
            ### Sub section 1
            ## Sub section 2
            # Main section 2
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
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
                })
            )
        )
    })

    it("structures README as expected", () => {
        const content = `
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
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
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
                })
            )
        )
    })
})
