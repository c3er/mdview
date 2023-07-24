exports.render = content => {
    const lines = content.split("\n")
    if (lines.length === 0 || lines[0].trim() !== "---") {
        return content
    }
    lines[0] = "**Metadata**<br>\n```yaml"

    const metadataEndIndex = lines.slice(1).findIndex(line => ["---", "..."].includes(line.trim()))
    if (metadataEndIndex < 0) {
        return content
    }
    lines[metadataEndIndex + 1] = "```"

    return lines.join("\n")
}

exports.hide = content => {
    const lines = content.split("\n")
    if (lines.length === 0 || lines[0].trim() !== "---") {
        return content
    }
    const metadataEndIndex = lines.slice(1).findIndex(line => ["---", "..."].includes(line.trim()))
    return metadataEndIndex >= 0 ? lines.slice(metadataEndIndex + 2).join("\n") : content
}
