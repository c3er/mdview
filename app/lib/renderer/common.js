let _document

function contentElement() {
    return _document.getElementById("content-body")
}

exports.init = document => (_document = document)

exports.contentElement = contentElement

exports.rawTextElement = () => _document.getElementById("raw-text")

exports.scrollTo = position => (contentElement().scrollTop = position)

exports.elementYPosition = element => {
    const containerElement = contentElement().children[0]
    return (
        element.getBoundingClientRect().top -
        (containerElement.getBoundingClientRect().top -
            Number(containerElement.style.paddingTop.replace("px", "")))
    )
}
