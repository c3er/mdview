class Section {
    static _lastId = 0

    id = 0
    header = ""
    parent = null
    subSections = []

    constructor(header) {
        this.header = header ?? ""
        this.id = ++Section._lastId
    }

    addSubSection(section) {
        section.parent = this
        this.subSections.push(section)
    }

    addSubsequentSection(section) {
        this.parent.addSubSection(section)
    }

    equals(other) {
        if (!other) {
            return false
        }

        if (this.constructor.name !== other.constructor.name) {
            return false
        }

        if (this.header !== other.header) {
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

exports.build = fileContent => {
    const rootSection = new Section()
    let currentSection = rootSection
    let lastSectionLevel = 0
    let isInCode = false
    const lines = fileContent
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => !!line)
    for (const line of lines) {
        if (line.startsWith("```")) {
            isInCode = !isInCode
        }
        if (isInCode || !line.startsWith("#")) {
            continue
        }
        const headerLineParts = line.split("#").map(part => part.trim())
        const headerLinePartCount = headerLineParts.length
        const sectionLevel = headerLinePartCount - 1
        const section = new Section(headerLineParts[headerLinePartCount - 1])
        if (sectionLevel > lastSectionLevel) {
            lastSectionLevel = sectionLevel
            currentSection.addSubSection(section)
            currentSection = section
        } else if (sectionLevel === lastSectionLevel) {
            currentSection.addSubsequentSection(section)
        } else {
            lastSectionLevel = sectionLevel
            currentSection = currentSection.parent
            currentSection.addSubsequentSection(section)
        }
    }
    return rootSection
}
