const ipc = require("../ipc/ipcRenderer")

const shared = require("./tocShared")

const SECTION_HTML_CLASS = "toc-section"
const EXPAND_BUTTON_HTML_CLASS = "toc-expand-button"
const ID_PREFIX = "toc-"
const BUTTON_ID_PREFIX = "toc-button-"

const COLLAPSED_SYMBOL = " ⯈ "
const EXPANDED_SYMBOL = " ⯆ "

const INDENTATION_WIDTH_PX = 15
const INDENTATION_OFFSET_PX = 20

let _document
let _headers = []
let _rootSection
const _info = {
    widthPx: shared.WIDTH_DEFAULT_PX,
    collapsedEntries: [],
}

class Section {
    #isExpanded = true

    header = ""
    id = ""
    parent = null
    subSections = []

    constructor(header, id) {
        this.header = header ?? ""
        this.id = id ?? ""
    }

    get htmlId() {
        return `${ID_PREFIX}${this.id}`
    }

    get buttonHtmlId() {
        return `${BUTTON_ID_PREFIX}${this.id}`
    }

    get hasSubSections() {
        return this.subSections.length > 0
    }

    get isExpanded() {
        return this.#isExpanded
    }

    set isExpanded(value) {
        _document.getElementById(this.htmlId).style.display = value ? "none" : "block"
        _document.getElementById(this.buttonHtmlId).innerText = value
            ? COLLAPSED_SYMBOL
            : EXPANDED_SYMBOL
        this.#isExpanded = value
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

    toggleExpanded() {
        this.isExpanded = !this.isExpanded
    }

    findId(id) {
        if (this.id === id) {
            return this
        }
        for (const section of this.subSections) {
            const found = section.findId(id)
            if (found) {
                return found
            }
        }
        return null
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

        let indentationWidth = level * INDENTATION_WIDTH_PX
        if (!this.hasSubSections) {
            indentationWidth += INDENTATION_OFFSET_PX
        }

        return `
            <div class="${SECTION_HTML_CLASS}">
                <nobr style="margin-left: ${indentationWidth}px">
                    <span class="${EXPAND_BUTTON_HTML_CLASS}" id="${this.buttonHtmlId}">
                        ${EXPANDED_SYMBOL}
                    </span>
                    <a href="#${this.id}">${this.header}</a>
                </nobr>
            </div>
            <div id="${this.htmlId}">${subSectionsHtml}</div>
        `
    }

    flattenTree(flattened) {
        flattened ??= []
        if (this.id) {
            flattened.push(this)
        }
        for (const subSection of this.subSections) {
            subSection.flattenTree(flattened)
        }
        return flattened
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

function registerSplitterElement(separatorElementId, leftElementId, rightElementId) {
    const left = _document.getElementById(leftElementId)
    const right = _document.getElementById(rightElementId)

    const leftStyle = getComputedStyle(left)
    const rightStyle = getComputedStyle(right)

    let mouseDownInfo
    _document.getElementById(separatorElementId).onmousedown = event => {
        mouseDownInfo = {
            event,
            leftWidth:
                left.offsetWidth -
                (parseInt(leftStyle.paddingLeft) + parseInt(leftStyle.paddingRight)),
            rightWidth:
                right.offsetWidth -
                (parseInt(rightStyle.paddingLeft) + parseInt(rightStyle.paddingRight)),
        }
        _document.onmousemove = event => {
            event.preventDefault()

            // Horizontal; prevent negative-sized elements
            const deltaX = Math.min(
                Math.max(event.clientX - mouseDownInfo.event.clientX, -mouseDownInfo.leftWidth),
                mouseDownInfo.rightWidth
            )

            left.style.width = `${mouseDownInfo.leftWidth + deltaX}px`
            right.style.width = `${mouseDownInfo.rightWidth - deltaX}px`
        }
        _document.onmouseup = () => {
            _document.onmousemove = _document.onmouseup = null

            _info.widthPx = mouseDownInfo.leftWidth // XXX Not the proper width value
            ipc.send(ipc.messages.updateToc, _info)
        }
    }
}

function reset() {
    _headers = []
    registerSplitterElement("separator", "outline", "content-body")
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

function setTocVisibility(isVisible) {
    const displayStyle = isVisible ? "block" : "none"
    _document.getElementById("outline").style.display = displayStyle
    _document.getElementById("separator").style.display = displayStyle
}

exports.Section = Section

exports.init = document => {
    _document = document
    reset()

    ipc.listen(ipc.messages.updateToc, tocInfo => {
        setTocVisibility(tocInfo.isVisible)

        // XXX Set width...

        for (const entryId of tocInfo.collapsedEntries) {
            const section = _rootSection.findId(entryId)
            if (section) {
                section.isExpanded = false
            }
        }
    })
}

exports.reset = reset

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

    let currentSection = (_rootSection = new Section())
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
            const sectionLevelDifference = previousSectionLevel - sectionLevel
            for (let i = 0; i < sectionLevelDifference; i++) {
                currentSection = currentSection.parent
            }
            currentSection = currentSection.addSubsequentSection(section)
        }
    }
    return _rootSection
}

exports.handleExpandButtonClick = section => {
    section.toggleExpanded()
    _info.collapsedEntries = _rootSection
        .flattenTree()
        .filter(section => !section.isExpanded)
        .map(section => section.id)
    ipc.send(ipc.messages.updateToc, _info)
}
