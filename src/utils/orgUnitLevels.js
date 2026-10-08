const sortByLevel = (left, right) => (Number(left.level) || 0) - (Number(right.level) || 0)

export const buildOrgUnitPath = (orgUnit) => {
    if (!orgUnit?.id) {
        return ''
    }
    if (typeof orgUnit.path === 'string' && orgUnit.path.startsWith('/')) {
        return orgUnit.path
    }

    const ancestors = [...(orgUnit.ancestors || [])].sort(sortByLevel)
    const ids = [...ancestors.map((ancestor) => ancestor.id), orgUnit.id].filter(Boolean)
    return ids.length ? `/${ids.join('/')}` : ''
}

/**
 * Paths the organisation unit tree can match. The tree compares paths that
 * start at each root, so a unit assigned below the national level still matches.
 */
export const pathsForTreeFilter = (orgUnit, rootIds) => {
    const fullPath = buildOrgUnitPath(orgUnit)
    if (!fullPath) {
        return []
    }

    const ids = fullPath.split('/').filter(Boolean)
    const paths = new Set([fullPath])
    ;(rootIds || []).forEach((rootId) => {
        const index = ids.indexOf(rootId)
        if (index !== -1) {
            paths.add(`/${ids.slice(index).join('/')}`)
        }
    })
    return [...paths]
}

export const resolveLevelColumns = (levels) =>
    [...(levels || [])]
        .filter((level) => Number.isFinite(Number(level.level)))
        .sort(sortByLevel)
        .map((level) => ({
            level: Number(level.level),
            name: level.displayName || level.name || `Level ${level.level}`,
        }))

export const levelsFromOrgUnits = (orgUnits) => {
    const levels = new Set()
    ;(orgUnits || []).forEach((orgUnit) => {
        if (orgUnit.level) {
            levels.add(Number(orgUnit.level))
        }
        ;(orgUnit.ancestors || []).forEach((ancestor) => {
            if (ancestor.level) {
                levels.add(Number(ancestor.level))
            }
        })
    })

    return [...levels]
        .filter((level) => Number.isFinite(level))
        .sort((left, right) => left - right)
        .map((level) => ({
            level,
            name: `Level ${level}`,
        }))
}

export const valueAtLevel = (orgUnit, level) => {
    if (!orgUnit) {
        return '—'
    }
    if (level == null) {
        return orgUnit.displayName || '—'
    }
    if (Number(orgUnit.level) === Number(level)) {
        return orgUnit.displayName || '—'
    }
    const ancestor = (orgUnit.ancestors || []).find(
        (item) => Number(item.level) === Number(level)
    )
    return ancestor?.displayName || '—'
}
