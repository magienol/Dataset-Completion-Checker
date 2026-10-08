import React, { useMemo } from 'react'
import { Button, OrganisationUnitTree } from '@dhis2/ui'

export function OrgUnitSelect({
    roots,
    selectedId,
    selectedPath,
    selectedName,
    filterPaths,
    showSelectAll,
    selectAllCount,
    onSelect,
    onSelectAll,
}) {
    const allSelected = selectedId === 'ALL'
    const hasGroupFilter = Array.isArray(filterPaths)
    const expandedRoots = useMemo(
        () => (roots || []).map((id) => `/${id}`),
        [roots]
    )

    return (
        <div className="org-unit-field">
            <div className="org-unit-field-header">
                <span className="org-unit-label">Organisation unit</span>
                {showSelectAll && (
                    <Button
                        small
                        primary={allSelected}
                        secondary={!allSelected}
                        onClick={onSelectAll}
                        disabled={!selectAllCount}
                    >
                        {`All units in selected groups (${selectAllCount})`}
                    </Button>
                )}
            </div>
            {selectedName ? (
                <p className="org-unit-selected">Selected: {selectedName}</p>
            ) : (
                <p className="org-unit-selected">
                    Expand the tree and select an organisation unit.
                </p>
            )}
            {hasGroupFilter && filterPaths.length === 0 ? (
                <p className="org-unit-selected">
                    No organisation units belong to the selected groups.
                </p>
            ) : !roots?.length ? (
                <p className="org-unit-selected">
                    No organisation units are available for this user.
                </p>
            ) : (
                <div className="org-unit-tree">
                    <OrganisationUnitTree
                        roots={roots}
                        singleSelection
                        selected={allSelected || !selectedPath ? [] : [selectedPath]}
                        initiallyExpanded={expandedRoots}
                        filter={hasGroupFilter ? filterPaths : undefined}
                        onChange={onSelect}
                    />
                </div>
            )}
        </div>
    )
}

export default OrgUnitSelect
