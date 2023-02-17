class Section {
    header = ""
    parent = null
    subSections = []

    constructor(header) {
        this.header = header ?? ""
    }

    addSubSection(section) {
        section.parent = this
        this.subSections.push(section)
    }

    addSubsequentSection(section) {
        this.parent.addSubSection(section)
    }

    equals(other) {
        if (
            !other ||
            this.constructor.name !== other.constructor.name ||
            this.header !== other.header
        ) {
            return false
        }

        const subSectionCount = this.subSections.length
        if (subSectionCount !== other.subSections.length) {
            return false
        }

        for (let i = 0; i < subSectionCount; i++) {
            if (!this.subSections[i].equals(other.subSections[i])) {
                return false
            }
        }

        return true
    }

    static fromObject(obj, parent) {
        const section = new Section(obj.header)
        if (parent) {
            section.parent = parent
        }
        for (const subSection of obj.subSections ?? []) {
            section.subSections.push(Section.fromObject(subSection, section))
        }
        return section
    }
}

exports.Section = Section

exports.build = content => {
    const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => !!line)
    let isInCode = false
    const rawSections = []
    for (const line of lines) {
        if (line.startsWith("```")) {
            isInCode = !isInCode
        }
        if (isInCode || !line.startsWith("#")) {
            continue
        }

        const headerLineParts = line.split("#").map(part => part.trim())
        const headerLinePartCount = headerLineParts.length
        rawSections.push({
            level: headerLinePartCount - 1,
            header: headerLineParts[headerLinePartCount - 1],
        })
    }

    // Normalize section levels
    const sectionCount = rawSections.length
    for (let i = 0; i < sectionCount; i++) {
        const rawSection = rawSections[i]
        const previousLevel = rawSections[i - 1]?.level
        if (rawSection.level - previousLevel > 1) {
            rawSection.level = previousLevel + 1
        }
    }

    const rootSection = new Section()
    let currentSection = rootSection
    for (let i = 0; i < sectionCount; i++) {
        const rawSection = rawSections[i]
        const previousRawSection = rawSections[i - 1]
        const sectionLevel = rawSection.level
        const previousSectionLevel = previousRawSection?.level
        const section = new Section(rawSection.header)
        if (!previousRawSection || sectionLevel > previousSectionLevel) {
            currentSection.addSubSection(section)
            currentSection = section
        } else if (sectionLevel === previousSectionLevel) {
            currentSection.addSubsequentSection(section)
        } else {
            currentSection = currentSection.parent
            currentSection.addSubsequentSection(section)
        }
    }
    return rootSection
}
