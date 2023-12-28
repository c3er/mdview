const common = require("./common")
const ipc = require("./ipcRenderer")
const metadata = require("./renderer/metadata")

const shared = require("./tocShared")

const SEPARATOR_HTML_ID = "separator"

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
let _settingsAreOverriden = false
let _headers = []
let _rootSection
let _lastId = 0
const _info = {
    widthPx: shared.WIDTH_DEFAULT_PX,
    collapsedEntries: [],
}

let _collapsedSymbolPath = COLLAPSED_SYMBOL_LIGHT_PATH
let _expandedSymbolPath = EXPANDED_SYMBOL_LIGHT_PATH

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
        this.changeButtonImage(value ? _expandedSymbolPath : _collapsedSymbolPath)
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
        _document.getElementById(this.buttonHtmlId).innerHTML = toButtonHtml(path)
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
        const BUTTON_OFFSET = 2.5 // em

        level ??= 0
        const subSectionsHtml = this.subSections
            .map(section => section.toHtml(level + 1))
            .join("\n")

        // The root section has never a valid header
        if (level === 0) {
            return subSectionsHtml
        }

        const indentationWidth =
            level * INDENTATION_WIDTH_PX + (this.hasSubSections ? 0 : INDENTATION_OFFSET_PX)
        const buttonOffset = this.hasSubSections ? BUTTON_OFFSET : 0
        return `
            <div class="${SECTION_HTML_CLASS}">
                <nobr style="margin-left: ${indentationWidth}px">
                    <span class="${EXPAND_BUTTON_HTML_CLASS}" id="${this.buttonHtmlId}">
                        ${toButtonHtml(_expandedSymbolPath)}
                    </span>
                    <a href="#${
                        this.id
                    }" style="width: calc(100% - ${indentationWidth}px - ${buttonOffset}em)">
                        ${this.header}
                    </a>
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

function toButtonHtml(imagePath) {
    return `<img src="${imagePath}">`
}

function changeTocWidth(tocWidth, deltaX) {
    deltaX ??= 0
    const tocElement = getTocElement()
    let updatedWidth = tocWidth + deltaX

    // If the user releases the mouse button too far left and ends the application after that, the
    // separator will be restored to its default position and not at the left edge as the user
    // might expect. The right side does not expose this problem.
    const tocMinWidth = parseFloat(getComputedStyle(tocElement).minWidth)
    if (updatedWidth < tocMinWidth) {
        updatedWidth = tocMinWidth
    }

    tocElement.style.flex = `0 0 ${updatedWidth}px`
    return updatedWidth
}

function registerSeparator(separatorElementId) {
    _document.getElementById(separatorElementId).onmousedown = mouseDownEvent => {
        let updatedWidth = 0
        const tocWidth = parseFloat(getComputedStyle(getTocElement()).width)
        _document.onmousemove = event => {
            event.preventDefault()
            updatedWidth = changeTocWidth(tocWidth, event.clientX - mouseDownEvent.clientX)
        }
        _document.onmouseup = () => {
            _document.onmousemove = _document.onmouseup = null

            _info.widthPx = updatedWidth
            ipc.send(ipc.messages.updateToc, _info)
        }
    }
}

function getTocElement() {
    return _document.querySelector("nav#toc")
}

function reset() {
    _headers = []
    _settingsAreOverriden = false
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
    getTocElement().style.display = displayStyle
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
        registerSeparator(SEPARATOR_HTML_ID)
    }

    ipc.listen(ipc.messages.updateToc, tocInfo => {
        if (_settingsAreOverriden) {
            return
        }

        _isVisible = tocInfo.isVisible
        setTocVisibility(_isVisible)
        changeTocWidth(tocInfo.widthPx)
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
    const lines = metadata
        .hide(content)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => Boolean(line))
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
            _expandedSymbolPath = EXPANDED_SYMBOL_DARK_PATH
            _collapsedSymbolPath = COLLAPSED_SYMBOL_DARK_PATH
            break
        case common.LIGHT_THEME:
            _expandedSymbolPath = EXPANDED_SYMBOL_LIGHT_PATH
            _collapsedSymbolPath = COLLAPSED_SYMBOL_LIGHT_PATH
            break
    }
    for (const section of _rootSection?.flattenTree() ?? []) {
        section.changeButtonImage(section.isExpanded ? _expandedSymbolPath : _collapsedSymbolPath)
    }
}

exports.overrideSettings = isOverriden => (_settingsAreOverriden = isOverriden)
