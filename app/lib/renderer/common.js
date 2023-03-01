let _document

exports.init = document => (_document = document)

exports.contentElement = () => _document.getElementById("content-body")
