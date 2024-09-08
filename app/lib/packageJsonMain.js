const fs = require("fs")
const path = require("path")

let _obj

exports.obj = () =>
    _obj ?? (_obj = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "package.json"))))
