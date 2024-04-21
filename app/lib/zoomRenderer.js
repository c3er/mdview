const ipc = require("./ipcRenderer")

exports.in = () => ipc.send(ipc.messages.zoomIn)

exports.out = () => ipc.send(ipc.messages.zoomOut)
