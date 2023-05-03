const ipc = require("../ipc/ipcRenderer")

const shared = require("./tocShared")

const CONTAINER_HTML_ID = "content"
const SEPARATOR_HTML_ID = "separator"
const TOC_HTML_ID = "toc"
const CONTENT_HTML_ID = "content-body"

const SECTION_HTML_CLASS = "toc-section"
const EXPAND_BUTTON_HTML_CLASS = "toc-expand-button"
const ID_PREFIX = "toc-"
const BUTTON_ID_PREFIX = "toc-button-"

const COLLAPSED_SYMBOL_LIGHT_PATH = "assets/toc/collapsed-light.svg"
const EXPANDED_SYMBOL_LIGHT_PATH = "assets/toc/expanded-light.svg"
const COLLAPSED_SYMBOL_DARK_PATH = "assets/toc/collapsed-dark.svg"
const EXPANDED_SYMBOL_DARK_PATH = "assets/toc/expanded-dark.svg"

const INDENTATION_WIDTH_PX = 15
const INDENTATION_OFFSET_PX = 30

const JSON_INDENTATION = 2

let _document
let _isVisible = false
let _headers = []
let _rootSection
let _lastId = 0
const _info = {
    widthPx: shared.WIDTH_DEFAULT_PX,
    collapsedEntries: [],
}

let collapsedSymbolPath = COLLAPSED_SYMBOL_LIGHT_PATH
let expandedSymbolPath = EXPANDED_SYMBOL_LIGHT_PATH

class Section {
    #isExpanded = true

    header = ""
    id = ""
    parent = null
    subSections = []

    constructor(header, id) {
        this.header = header ?? ""
        this.id = id ?? (_lastId++).toString()
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
        _document.getElementById(this.htmlId).style.display = value ? "block" : "none"
        this.changeButtonImage(value ? expandedSymbolPath : collapsedSymbolPath)
        this.#isExpanded = value
    }

    get isRoot() {
        return !this.parent
    }

    addSubSection(section) {
        section.parent = this
        this.subSections.push(section)
    }

    addSubsequentSection(section) {
        this.parent.addSubSection(section)
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

    changeButtonImage(path) {
        _document.getElementById(this.buttonHtmlId).innerHTML = _toButtonHtml(path)
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

    toObject() {
        return {
            header: this.header,
            subSections: this.subSections.map(section => section.toObject()),
        }
    }

    toJson() {
        return JSON.stringify(this.toObject(), null, JSON_INDENTATION)
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
            <div class="${SECTION_HTML_CLASS}">
                <nobr style="margin-left: ${
                    level * INDENTATION_WIDTH_PX + (this.hasSubSections ? 0 : INDENTATION_OFFSET_PX)
                }px">
                    <span class="${EXPAND_BUTTON_HTML_CLASS}" id="${this.buttonHtmlId}">
                        ${_toButtonHtml(expandedSymbolPath)}
                    </span>
                    <a href="#${this.id}">${this.header}</a>
                </nobr>
            </div>
            <div id="${this.htmlId}">${subSectionsHtml}</div>
        `
    }

    flattenTree(flattened) {
        flattened ??= []
        if (!this.isRoot) {
            flattened.push(this)
        }
        for (const subSection of this.subSections) {
            subSection.flattenTree(flattened)
        }
        return flattened
    }
}

function _toButtonHtml(imagePath) {
    return `<img src="${imagePath}">`
}

function changeTocWidth(tocWidth, tocElementId, deltaX) {
    deltaX ??= 0
    const tocElement = _document.getElementById(tocElementId)
    const tocMinWidth = parseFloat(getComputedStyle(tocElement).minWidth)
    let updatedWidth = tocWidth + deltaX
    if (updatedWidth < tocMinWidth) {
        updatedWidth = tocMinWidth
    }
    tocElement.style.flex = `0 0 ${updatedWidth}px`
    return updatedWidth
}

function registerSeparator(containerElementId, separatorElementId, tocElementId, contentElementId) {
    _document.getElementById(separatorElementId).onmousedown = mouseDownEvent => {
        let updatedWidth = 0
        const tocWidth = parseFloat(getComputedStyle(_document.getElementById(tocElementId)).width)
        _document.onmousemove = event => {
            event.preventDefault()
            updatedWidth = changeTocWidth(
                tocWidth,
                tocElementId,
                event.clientX - mouseDownEvent.clientX
            )
        }
        _document.onmouseup = () => {
            _document.onmousemove = _document.onmouseup = null

            _info.widthPx = updatedWidth
            ipc.send(ipc.messages.updateToc, _info)
        }
    }
}

function reset() {
    _headers = []
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
    _document.getElementById(TOC_HTML_ID).style.display = displayStyle
    _document.getElementById(SEPARATOR_HTML_ID).style.display = displayStyle
}

function fromObject(obj) {
    const section = new Section(obj.header)
    for (const subSection of obj.subSections ?? []) {
        section.addSubSection(fromObject(subSection))
    }
    return section
}

exports.Section = Section

exports.init = (document, isTest) => {
    _document = document
    reset()
    if (!isTest) {
        registerSeparator(CONTAINER_HTML_ID, SEPARATOR_HTML_ID, TOC_HTML_ID, CONTENT_HTML_ID)
    }

    ipc.listen(ipc.messages.updateToc, tocInfo => {
        _isVisible = tocInfo.isVisible
        setTocVisibility(_isVisible)
        changeTocWidth(tocInfo.widthPx, TOC_HTML_ID)
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
            currentSection.addSubSection(section)
        } else if (sectionLevel === previousSectionLevel) {
            currentSection.addSubsequentSection(section)
        } else {
            const sectionLevelDifference = previousSectionLevel - sectionLevel
            for (let i = 0; i < sectionLevelDifference; i++) {
                currentSection = currentSection.parent
            }
            currentSection.addSubsequentSection(section)
        }
        currentSection = section
    }
    return _rootSection
}

exports.fromObject = fromObject

exports.handleExpandButtonClick = section => {
    section.toggleExpanded()
    _info.collapsedEntries = _rootSection
        .flattenTree()
        .filter(section => !section.isExpanded)
        .map(section => section.id)
    ipc.send(ipc.messages.updateToc, _info)
}

exports.setVisibility = setTocVisibility

exports.getVisibility = () => _isVisible

exports.updateTheme = theme => {
    switch (theme) {
        case common.DARK_THEME:
            expandedSymbolPath = EXPANDED_SYMBOL_DARK_PATH
            collapsedSymbolPath = COLLAPSED_SYMBOL_DARK_PATH
            break
        case common.LIGHT_THEME:
            expandedSymbolPath = EXPANDED_SYMBOL_LIGHT_PATH
            collapsedSymbolPath = COLLAPSED_SYMBOL_LIGHT_PATH
            break
    }
    for (const section of _rootSection?.flattenTree() ?? []) {
        section.changeButtonImage(section.isExpanded ? expandedSymbolPath : collapsedSymbolPath)
    }
}
