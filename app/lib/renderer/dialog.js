exports.addStdButtonHandler = (element, callback) => {
    element.addEventListener("click", event => {
        event.preventDefault()
        callback()
    })
}
