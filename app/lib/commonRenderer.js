const BOTH_SIDES_SHADOW_CLASS = "both-sides-shadow"
const TOP_SHADOW_CLASS = "top-shadow"
const BOTTOM_SHADOW_CLASS = "bottom-shadow"

let _document
let _window
let _shallPreventScrollEvent = false

function contentElement() {
    return _document.querySelector("article#content-body")
}

function isScrolledToTop(element) {
    return element.scrollTop <= 0
}

function isScrolledToBottom(element) {
    return Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= 1
}

function isOverflowing(scrollContainer, element) {
    return parseFloat(_window.getComputedStyle(element).height) > scrollContainer.clientHeight
}

function removeShadows(scrollContainer) {
    const scrollClassList = scrollContainer.classList
    scrollClassList.remove(BOTH_SIDES_SHADOW_CLASS)
    scrollClassList.remove(TOP_SHADOW_CLASS)
    scrollClassList.remove(BOTTOM_SHADOW_CLASS)
}

function addBottomShadow(scrollContainer, element) {
    if (isOverflowing(scrollContainer, element)) {
        scrollContainer.classList.add(BOTTOM_SHADOW_CLASS)
    }
}

function updateShadows(scrollContainer) {
    const scrollClassList = scrollContainer.classList
    removeShadows(scrollContainer)
    if (isScrolledToTop(scrollContainer)) {
        scrollClassList.add(BOTTOM_SHADOW_CLASS)
    } else if (isScrolledToBottom(scrollContainer)) {
        scrollClassList.add(TOP_SHADOW_CLASS)
    } else {
        scrollClassList.add(BOTH_SIDES_SHADOW_CLASS)
    }
}

exports.init = (document, window) => {
    _document = document
    _window = window
}

exports.contentElement = contentElement

exports.scrollTo = position => (contentElement().scrollTop = position)

exports.elementYPosition = element => {
    const containerElement = contentElement().children[0]
    return (
        element.getBoundingClientRect().top -
        (containerElement.getBoundingClientRect().top -
            Number(containerElement.style.paddingTop.replace("px", "")))
    )
}

exports.addStdButtonHandler = (element, callback) => {
    element.onclick = event => {
        event.preventDefault()
        callback()
    }
}

exports.setupShadows = (scrollContainer, contentElement) => {
    scrollContainer.onscroll = () => {
        if (_shallPreventScrollEvent) {
            _shallPreventScrollEvent = false
            return
        }
        updateShadows(scrollContainer)
    }
    contentElement ??= scrollContainer.children[0]
    new _window.ResizeObserver(() => {
        if (isOverflowing(scrollContainer, contentElement)) {
            updateShadows(scrollContainer)
        } else {
            removeShadows(scrollContainer)
        }
    }).observe(scrollContainer)
}

exports.preventNextScrollEvent = () => (_shallPreventScrollEvent = true)

exports.removeShadows = removeShadows

exports.addBottomShadow = addBottomShadow
