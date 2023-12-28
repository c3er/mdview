const common = require("./common")

module.exports = common.isRendererProcess ? require("./logRenderer") : require("./logMain")
