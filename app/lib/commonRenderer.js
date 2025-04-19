let _document

function contentElement() {
    return _document.querySelector("article#content-body")
}

exports.init = document => (_document = document)

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
    element.addEventListener("click", event => {
        event.preventDefault()
        callback()
    })
}
