const SECTION_HTML_CLASS = "toc-section"

let _headers = {}

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
                    <span>${this.header}</span>
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

function parseHeaderLine(line) {
    line = line.trim()
    const lineLength = line.length
    for (let i = 0; i < lineLength; i++) {
        if (line[i] !== "#") {
            return {
                level: i,
                header: [...line].slice(i).join("").trim(),
            }
        }
    }
    return {
        level: lineLength,
        header: "",
    }
}

exports.SECTION_HTML_CLASS = SECTION_HTML_CLASS

exports.Section = Section

exports.reset = () => (_headers = [])

exports.slugify = text => {
    if (!_headers[text]) {
        _headers[text] = []
    }
    const identicalHeaders = _headers[text]
    const slugified =
        text
            .replace(/\[|\]|<.*>|\(.*\)|\.|`|\{|\}/g, "")
            .trim()
            .replace(/\s/g, "-")
            .toLowerCase() + `-${identicalHeaders.length}`
    identicalHeaders.push(slugified)
    return slugified
}

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

        rawSections.push(parseHeaderLine(line))
    }

    // Normalize section levels
    const sectionCount = rawSections.length
    for (let i = 0; i < sectionCount; i++) {
        const rawSection = rawSections[i]
        const previousLevel = rawSections[i - 1]?.level ?? 0
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
            currentSection = currentSection.addSubSection(section)
        } else if (sectionLevel === previousSectionLevel) {
            currentSection = currentSection.addSubsequentSection(section)
        } else {
            currentSection = currentSection.parent.addSubsequentSection(section)
        }
    }
    return rootSection
}
