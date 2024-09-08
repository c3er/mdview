function findMetadataEndIndex(lines) {
    return lines.slice(1).findIndex(line => ["---", "..."].includes(line.trim())) + 1
}

exports.render = content => {
    const lines = content.split("\n")
    if (lines.length === 0 || lines[0].trim() !== "---") {
        return content
    }
    lines[0] = "**Metadata**<br>\n```yaml"

    const metadataEndIndex = findMetadataEndIndex(lines)
    if (metadataEndIndex <= 0) {
        return content
    }
    lines[metadataEndIndex] = "```"

    return lines.join("\n")
}

exports.hide = content => {
    const lines = content.split("\n")
    if (lines.length === 0 || lines[0].trim() !== "---") {
        return content
    }
    const metadataEndIndex = findMetadataEndIndex(lines)
    return metadataEndIndex >= 0 ? lines.slice(metadataEndIndex + 1).join("\n") : content
}
