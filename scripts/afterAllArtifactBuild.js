const crypto = require("crypto")
const fs = require("fs/promises")
const path = require("path")

const ALGORITHMS = ["sha1", "sha256"]
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

exports.default = async context => {
    const artifactPaths = context.artifactPaths
    const maxArtifactPathLength = Math.max(
        ...artifactPaths.map(artifactPath => artifactPath.length),
    )
    const maxAlgorithmNameLength = Math.max(...ALGORITHMS.map(algorithm => algorithm.length))
    for (const artifactPath of artifactPaths) {
        for (const algorithm of ALGORITHMS) {
            const checksum = await calcChecksum(artifactPath, algorithm)
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
    }
}
