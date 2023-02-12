const assert = require("chai").assert

const toc = require("../app/lib/renderer/toc")

describe('Library "TOC"', () => {
    it("recognizes a header", () => {
        const headerText = "Some header"
        const content = `# ${headerText}`
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
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

    it("recognizes two headers", () => {
        const headerText1 = "Header 1"
        const headerText2 = "Header 2"
        const content = `
            # ${headerText1}

            # ${headerText2}
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
                    subSections: [
                        {
                            header: headerText1,
                            subSection: [],
                        },
                        {
                            header: headerText2,
                            subSection: [],
                        },
                    ],
                })
            )
        )
    })

    it("recognizes a section with subsection", () => {
        const sectionText = "Main section"
        const subSectionText = "Sub section"
        const content = `
            # ${sectionText}

            ## ${subSectionText}
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
                    subSections: [
                        {
                            header: sectionText,
                            subSections: [
                                {
                                    header: subSectionText,
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
        const sectionText1 = "Main section 1"
        const subSectionText = "Sub section"
        const sectionText2 = "Main section 2"
        const content = `
            # ${sectionText1}

            ## ${subSectionText}

            # ${sectionText2}
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
                    subSections: [
                        {
                            header: sectionText1,
                            subSections: [
                                {
                                    header: subSectionText,
                                    subSections: [],
                                },
                            ],
                        },
                        {
                            header: sectionText2,
                            subSections: [],
                        },
                    ],
                })
            )
        )
    })

    it("indents only one level at finding sub section two levels deeper", () => {
        const mainSectionText1 = "Main section 1"
        const subSectionText1 = "Sub section 1"
        const subSectionText2 = "Sub section 2"
        const mainSectionText2 = "Main section 2"
        const content = `
            # ${mainSectionText1}

            ### ${subSectionText1}

            ## ${subSectionText2}

            # ${mainSectionText2}
        `
        assert.isTrue(
            toc.build(content).equals(
                toc.Section.fromObject({
                    subSections: [
                        {
                            header: mainSectionText1,
                            subSections: [
                                {
                                    header: subSectionText1,
                                    subSections: [],
                                },
                                {
                                    header: subSectionText2,
                                    subSections: [],
                                },
                            ],
                        },
                        {
                            header: mainSectionText2,
                            subSections: [],
                        },
                    ],
                })
            )
        )
    })
})
