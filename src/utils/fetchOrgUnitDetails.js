import { extractCollection } from './dhis2Api'

const CHUNK_SIZE = 50

export const fetchOrgUnitDetails = async (engine, ids) => {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))]
    const byId = {}

    for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(index, index + CHUNK_SIZE)
        const result = await engine.query({
            organisationUnits: {
                resource: 'organisationUnits',
                params: {
                    filter: `id:in:[${chunk.join(',')}]`,
                    fields: 'id,displayName,level,ancestors[id,displayName,level]',
                    paging: false,
                },
            },
        })
        extractCollection(result.organisationUnits, 'organisationUnits').forEach((unit) => {
            if (unit?.id) {
                byId[unit.id] = unit
            }
        })
    }

    return byId
}
