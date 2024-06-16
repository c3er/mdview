const fs = require("fs/promises")
const path = require("path")

async function removeFiles(dir, files) {
    for (const file of files) {
        try {
            const filePath = path.join(dir, file)
            console.log(`Removing "${filePath}"...`)
            await fs.rm(filePath, { recursive: true })
        } catch (error) {
            console.error(error)
        }
    }
}

async function removeResources(dir, filesToKeep) {
    console.log(`Removing resources from "${dir}"...`)
    console.log(`Files to keep: ${filesToKeep.join(", ")}`)
    await removeFiles(
        dir,
        (await fs.readdir(dir)).filter(file => !filesToKeep.includes(file)),
    )
}

exports.default = async context => {
    const LOCALES_DIR = "locales"
    const LOCALE_TO_KEEP = "en-US.pak"

    const MAC_RESOURCE_DIR =
        "mdview.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources"
    const MAC_RESOURCES_TO_KEEP = [
        "Info.plist",
        "MainMenu.nib",
        "chrome_100_percent.pak",
        "chrome_200_percent.pak",
        "en.lproj",
        "resources.pak",
        "v8_context_snapshot.arm64.bin",
        "icudtl.dat",
    ]

    const FILES_TO_REMOVE = {
        win32: [
            {
                dir: ".",
                files: [
                    "d3dcompiler_47.dll",
                    "vk_swiftshader.dll",
                    "vk_swiftshader_icd.json",
                    "vulkan-1.dll",
                ],
            },
        ],
        linux: [], // XXX Propr Linux box needed
        darwin: [
            {
                dir: "mdview.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries",
                files: ["libvk_swiftshader.dylib", "vk_swiftshader_icd.json"],
            },
        ],
    }

    const outDir = context.appOutDir
    const platform = context.electronPlatformName

    const outDirContent = await fs.readdir(outDir)
    if (outDirContent.includes(LOCALES_DIR)) {
        await removeResources(path.join(outDir, LOCALES_DIR), [LOCALE_TO_KEEP])
    }

    const fileInfos = FILES_TO_REMOVE[platform]
    if (fileInfos === undefined) {
        console.error(`Error: platform "${platform}" not supported`)
        return
    }
    for (const info of fileInfos) {
        await removeFiles(path.join(outDir, info.dir), info.files)
    }

    if (platform === "darwin") {
        await removeResources(path.join(outDir, MAC_RESOURCE_DIR), MAC_RESOURCES_TO_KEEP)
    }
}
