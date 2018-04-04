const path = require("path")
const fs = require("fs")
const marked = require("marked")

document.getElementById('content').innerHTML =
    marked(fs.readFileSync(path.join(__dirname, "README.md"), "utf8"))
