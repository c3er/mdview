const crypto = require("crypto")
const fs = require("fs/promises")
const path = require("path")

const PACKAGE_JSON_PATH = "package.json"

const DEFAULT_ALGORITHM = "sha256"
const ALGORITHMS = ["sha1", DEFAULT_ALGORITHM]

const CHUNK_SIZE = 1000000

async function calcChecksum(filePath, algorithm) {
    const hash = crypto.createHash(algorithm)
    const file = await fs.open(filePath)
    try {
        let bytesRead = 0
        do {
            let buffer = Buffer.alloc(CHUNK_SIZE)
            bytesRead = (await file.read(buffer, 0, CHUNK_SIZE)).bytesRead
            buffer = buffer.subarray(0, bytesRead)
            hash.update(buffer)
        } while (bytesRead > 0)
    } finally {
        if (file !== undefined) {
            await file.close()
        }
    }
    return hash.digest("hex")
}

async function parseJson(path) {
    return JSON.parse(await fs.readFile(path, { encoding: "utf-8" }))
}

async function createChecksumFiles(artifactPaths) {
    const maxArtifactPathLength = Math.max(
        ...artifactPaths.map(artifactPath => artifactPath.length),
    )
    const maxAlgorithmNameLength = Math.max(...ALGORITHMS.map(algorithm => algorithm.length))
    const artifacts = []
    for (const artifactPath of artifactPaths) {
        const artifact = {
            path: artifactPath,
        }
        for (const algorithm of ALGORITHMS) {
            const checksum = await calcChecksum(artifactPath, algorithm)
            artifact[algorithm] = checksum
            await fs.writeFile(
                `${artifactPath}.${algorithm}`,
                `${checksum}  ${path.basename(artifactPath)}\n`,
            )
            console.log(
                `${artifactPath.padEnd(maxArtifactPathLength)} ${algorithm.padEnd(
                    maxAlgorithmNameLength,
                )} ${checksum}`,
            )
        }
        artifacts.push(artifact)
    }
    return artifacts
}

async function createScoopManifest(outDir, artifacts) {
    const MANIFEST_TEMPLAE_PATH = "build/scoop-manifest.template.json"
    const MANIFEST_NAME = "mdview.json"
    const INDENTATION = 4

    const zipArtifact = artifacts.find(artifact => artifact.path.toLowerCase().endsWith(".zip"))
    if (!zipArtifact) {
        return
    }

    const version = (await parseJson(PACKAGE_JSON_PATH)).version
    const manifest = await parseJson(MANIFEST_TEMPLAE_PATH)

    manifest.version = version
    manifest.url = manifest.url.replaceAll("{{ VERSION }}", version)
    manifest.hash = zipArtifact[DEFAULT_ALGORITHM]

    const manifestPath = path.join(outDir, MANIFEST_NAME)
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, INDENTATION))
    console.log(`Genrated Scoop manifest: ${manifestPath}`)
}

exports.default = async context => {
    const artifacts = await createChecksumFiles(context.artifactPaths)
    await createScoopManifest(context.outDir, artifacts)
}
