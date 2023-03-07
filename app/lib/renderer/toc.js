const SECTION_HTML_CLASS = "toc-section"

let _headers = []

class Section {
    header = ""
    id = ""
    parent = null
    subSections = []

    constructor(header, id) {
        this.header = header ?? ""
        this.id = id ?? ""
    }

    addSubSection(section) {
        section.parent = this
        this.subSections.push(section)
        return section
    }

    addSubsequentSection(section) {
        this.parent.addSubSection(section)
        return section
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

    toHtml(level) {
        level ??= 0
        const subSectionsHtml = this.subSections
            .map(section => section.toHtml(level + 1))
            .join("\n")

        // The root section has never a valid header
        if (level === 0) {
            return subSectionsHtml
        }

        return `
            <div class="${SECTION_HTML_CLASS}" style="margin-left: ${level * 10}px">
                <nobr>
                    <span>⯈</span>
                    <a href="#${this.id}">${this.header}</a>
                </nobr>
            </div>
            <div>${subSectionsHtml}</div>
        `
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

function calcSectionLevel(line) {
    line = line.trim()
    const lineLength = line.length
    for (let i = 0; i < lineLength; i++) {
        if (line[i] !== "#") {
            return i
        }
    }
    return lineLength
}

exports.SECTION_HTML_CLASS = SECTION_HTML_CLASS

exports.Section = Section

exports.reset = () => (_headers = [])

exports.addHeader = (title, id) => _headers.push({ title, id })

exports.build = content => {
    const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => !!line)
    let isInCode = false
    const sectionLevels = []
    for (const line of lines) {
        if (line.startsWith("```")) {
            isInCode = !isInCode
        }
        if (isInCode || !line.startsWith("#")) {
            continue
        }

        sectionLevels.push(calcSectionLevel(line))
    }

    // Normalize section levels
    const sectionCount = sectionLevels.length
    for (let i = 0; i < sectionCount; i++) {
        const previousLevel = sectionLevels[i - 1] ?? 0
        if (sectionLevels[i] - previousLevel > 1) {
            sectionLevels[i] = previousLevel + 1
        }
    }

    const rootSection = new Section()
    let currentSection = rootSection
    for (let i = 0; i < sectionCount; i++) {
        const sectionLevel = sectionLevels[i]
        const previousSectionLevel = sectionLevels[i - 1] ?? -1
        const headerInfo = _headers[i]
        const section = new Section(headerInfo.title, headerInfo.id)

        if (previousSectionLevel < 0 || sectionLevel > previousSectionLevel) {
            currentSection = currentSection.addSubSection(section)
        } else if (sectionLevel === previousSectionLevel) {
            currentSection = currentSection.addSubsequentSection(section)
        } else {
            currentSection = currentSection.parent.addSubsequentSection(section)
        }
    }
    return rootSection
}
