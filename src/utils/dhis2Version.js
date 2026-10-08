/**
 * DHIS2 version helpers for 2.40 through 2.43, including SNAPSHOT builds.
 *
 * Handles strings like:
 *  2.40, 2.40.0, 2.40.1, 2.40-SNAPSHOT, 2.40.0-SNAPSHOT
 *  2.41-SNAPSHOT, 2.42.0.1, 2.43, 2.43-SNAPSHOT
 */

export const MIN_SUPPORTED_DHIS2_VERSION = '2.40'
export const MAX_SUPPORTED_DHIS2_VERSION = '2.43'
export const SUPPORTED_DHIS2_RANGE_LABEL = '2.40 through 2.43 (including SNAPSHOT builds)'

const parseIntOrZero = (value) => {
    const parsed = parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : 0
}

export const parseDhis2Version = (versionInput) => {
    if (!versionInput) {
        return null
    }

    if (typeof versionInput === 'object') {
        const full = versionInput.full || ''
        const tag = versionInput.tag || (full.includes('-') ? full.split('-').slice(1).join('-') : '')
        const extra = typeof full === 'string' ? full.split('-')[0]?.split('.') || [] : []
        return {
            full: full || [versionInput.major, versionInput.minor, versionInput.patch].filter((part) => part !== undefined).join('.'),
            major: parseIntOrZero(versionInput.major),
            minor: parseIntOrZero(versionInput.minor),
            patch: parseIntOrZero(versionInput.patch ?? extra[2]),
            hotfix: parseIntOrZero(extra[3]),
            snapshot: /snapshot/i.test(tag || full),
            tag: tag || undefined,
        }
    }

    const raw = String(versionInput).trim()
    if (!raw) {
        return null
    }

    const [numericPart, ...tagParts] = raw.split('-')
    const tag = tagParts.join('-')
    const [major, minor, patch, hotfix] = numericPart.split('.')

    return {
        full: raw,
        major: parseIntOrZero(major),
        minor: parseIntOrZero(minor),
        patch: parseIntOrZero(patch),
        hotfix: parseIntOrZero(hotfix),
        snapshot: /snapshot/i.test(tag),
        tag: tag || undefined,
    }
}

const toTuple = (version) => [
    version.major,
    version.minor,
    version.patch,
    version.hotfix,
]

const compareTuples = (left, right) => {
    for (let i = 0; i < 4; i += 1) {
        if (left[i] !== right[i]) {
            return left[i] - right[i]
        }
    }
    return 0
}

/**
 * Compares the numeric parts of two versions. A SNAPSHOT tag does not change
 * the numeric comparison, so 2.40-SNAPSHOT compares equal to 2.40.
 */
export const compareDhis2Versions = (leftInput, rightInput) => {
    const left = parseDhis2Version(leftInput)
    const right = parseDhis2Version(rightInput)
    if (!left && !right) return 0
    if (!left) return -1
    if (!right) return 1
    return compareTuples(toTuple(left), toTuple(right))
}

/**
 * Range membership uses major and minor only, matching DHIS2 app compatibility.
 * Max 2.43 therefore includes 2.43.0, 2.43.1, and later 2.43 patches.
 */
export const isSupportedDhis2Version = (versionInput) => {
    const parsed = parseDhis2Version(versionInput)
    const min = parseDhis2Version(MIN_SUPPORTED_DHIS2_VERSION)
    const max = parseDhis2Version(MAX_SUPPORTED_DHIS2_VERSION)
    if (!parsed || !min || !max || !parsed.major || !parsed.minor) {
        return false
    }

    const versionKey = parsed.major * 1000 + parsed.minor
    const minKey = min.major * 1000 + min.minor
    const maxKey = max.major * 1000 + max.minor
    return versionKey >= minKey && versionKey <= maxKey
}

export const getDhis2ApiVersion = (versionInput) => {
    const parsed = parseDhis2Version(versionInput)
    if (!parsed || parsed.major !== 2 || !parsed.minor) {
        return 40
    }
    return parsed.minor
}
