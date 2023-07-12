const fs = require("fs/promises")
const path = require("path")

async function removeFiles(dir, files) {
    for (const file of files) {
        try {
            const filePath = path.join(dir, file)
            console.log(`Removing "${filePath}"...`)
            await fs.rm(filePath)
        } catch (error) {
            console.log(error)
        }
    }
}

exports.default = async context => {
    const LOCALES_DIR = "locales"
    const LOCALE_TO_KEEP = "en-US.pak"
    const FILES_TO_REMOVE = {
        win32: [
            "d3dcompiler_47.dll",
            "vk_swiftshader.dll",
            "vk_swiftshader_icd.json",
            "vulkan-1.dll",
        ],
    }

    const outDir = context.appOutDir

    const outDirContent = await fs.readdir(outDir)
    if (outDirContent.includes(LOCALES_DIR)) {
        const localesDir = path.join(outDir, LOCALES_DIR)
        await removeFiles(
            localesDir,
            (await fs.readdir(localesDir)).filter(locale => locale !== LOCALE_TO_KEEP),
        )
    }

    await removeFiles(outDir, FILES_TO_REMOVE[context.electronPlatformName])
}
