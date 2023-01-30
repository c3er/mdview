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

    addSubSection(header) {
        const section = new Section(header)
        section.parent = this
        this.subSections.push(section)
        return section
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

    let isInCode = false
    const lines = fileContent
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => !!line)
    for (const line of lines) {
        if (line.startsWith("```")) {
            isInCode = !isInCode
        }
        if (!isInCode) {
            if (line.startsWith("#")) {
                const headerLineParts = line.split("#")
                rootSection.addSubSection(headerLineParts[headerLineParts.length - 1].trim())
            }
        }
    }

    return rootSection
}
