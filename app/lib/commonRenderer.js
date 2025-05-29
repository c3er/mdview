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

function removeShadows(scrollContainer) {
    const scrollClassList = scrollContainer.classList
    scrollClassList.remove(BOTH_SIDES_SHADOW_CLASS)
    scrollClassList.remove(TOP_SHADOW_CLASS)
    scrollClassList.remove(BOTTOM_SHADOW_CLASS)
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

exports.setupShadows = scrollContainer => {
    const scrollClassList = scrollContainer.classList
    scrollContainer.onscroll = () => {
        if (_shallPreventScrollEvent) {
            _shallPreventScrollEvent = false
            return
        }

        removeShadows(scrollContainer)
        const scrolledToTop = isScrolledToTop(scrollContainer)
        const scrolledToBottom = isScrolledToBottom(scrollContainer)
        if (scrolledToTop) {
            scrollClassList.add(BOTTOM_SHADOW_CLASS)
        } else if (scrolledToBottom) {
            scrollClassList.add(TOP_SHADOW_CLASS)
        } else {
            scrollClassList.add(BOTH_SIDES_SHADOW_CLASS)
        }
    }
}

exports.preventNextScrollEvent = () => (_shallPreventScrollEvent = true)

exports.removeShadows = removeShadows

exports.addBottomShadow = (scrollContainer, element) => {
    if (parseFloat(_window.getComputedStyle(element).height) > scrollContainer.clientHeight) {
        scrollContainer.classList.add(BOTTOM_SHADOW_CLASS)
    }
}
