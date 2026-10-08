import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDataQuery, useDataEngine, useConfig } from '@dhis2/app-runtime'
import {
    Button,
    ButtonStrip,
    Card,
    CenteredContent,
    CircularLoader,
    LinearLoader,
    CssVariables,
    DropdownButton,
    FlyoutMenu,
    MenuItem,
    MultiSelectField,
    MultiSelectOption,
    NoticeBox,
    Pagination,
    SingleSelectField,
    SingleSelectOption,
    Table,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TableCellHead,
} from '@dhis2/ui'
import DatasetRow from './components/DatasetRow'
import OrgUnitSelect from './components/OrgUnitSelect'
import * as XLSX from 'xlsx'
import { isSupportedDhis2Version, SUPPORTED_DHIS2_RANGE_LABEL } from './utils/dhis2Version'
import { extractCollection, buildCompleteRegistration, getUsername } from './utils/dhis2Api'
import { resolveLevelColumns, valueAtLevel } from './utils/orgUnitLevels'
import { fetchOrgUnitDetails } from './utils/fetchOrgUnitDetails'
import { hasKnownStatus } from './utils/fetchOrgUnitStatus'
import { useOrgUnitStatusLoader } from './hooks/useOrgUnitStatusLoader'
import './App.css'

const unpagedParams = {
    paging: false,
}

const dataSetsQuery = {
    dataSets: {
        resource: 'dataSets',
        params: {
            fields: 'id,displayName,periodType',
            ...unpagedParams,
        }
    }
}

const orgUnitRootsQuery = {
    organisationUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id',
            filter: 'level:eq:1',
            paging: false,
        },
    },
}

const orgUnitGroupsQuery = {
    organisationUnitGroups: {
        resource: 'organisationUnitGroups',
        params: {
            fields: 'id,displayName',
            ...unpagedParams,
        }
    }
}

const currentUserQuery = {
    me: {
        resource: 'me',
        params: {
            fields: 'id,displayName,username,organisationUnits[id,displayName,path],dataViewOrganisationUnits[id,displayName,path]',
        }
    }
}

const orgUnitLevelsQuery = {
    organisationUnitLevels: {
        resource: 'organisationUnitLevels',
        params: {
            fields: 'id,level,displayName,name',
            paging: false,
        },
    },
}

const systemInfoQuery = {
    systemInfo: {
        resource: 'system/info'
    }
}

const DATA_PRESENCE_OPTIONS = [
    { value: 'HAS_DATA', label: 'Has data' },
    { value: 'NO_DATA', label: 'No data' },
]

const COMPLETION_OPTIONS = [
    { value: 'COMPLETE', label: 'Complete' },
    { value: 'INCOMPLETE', label: 'Incomplete' },
    { value: 'NOT_SUBMITTED', label: 'Not completed / not submitted' },
]

const matchesTableFilters = (status, dataPresenceFilter, completionFilter) => {
    if (!hasKnownStatus(status)) {
        return false
    }

    if (dataPresenceFilter === 'HAS_DATA' && status.hasData !== true) {
        return false
    }
    if (dataPresenceFilter === 'NO_DATA' && status.hasData !== false) {
        return false
    }

    if (completionFilter === 'COMPLETE' && status.isCompleted !== true) {
        return false
    }
    if (
        completionFilter === 'INCOMPLETE' &&
        !(status.hasData === true && status.isCompleted === false)
    ) {
        return false
    }
    if (
        completionFilter === 'NOT_SUBMITTED' &&
        !(status.hasData === false && status.isCompleted === false)
    ) {
        return false
    }

    return true
}

export function App() {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    // State hooks
    const [selectedYear, setSelectedYear] = useState(() => String(currentYear))
    const [selectedMonth, setSelectedMonth] = useState(() => String(currentMonth).padStart(2, '0'))
    const [period, setPeriod] = useState('')
    const [datasetId, setDatasetId] = useState('')
    const [datasetName, setDatasetName] = useState('')
    const [selectedGroups, setSelectedGroups] = useState([])
    const [orgUnit, setOrgUnit] = useState('')
    const [orgUnitName, setOrgUnitName] = useState('')
    const [orgUnitPath, setOrgUnitPath] = useState('')
    const [searchApplied, setSearchApplied] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [dataPresenceFilter, setDataPresenceFilter] = useState('')
    const [completionFilter, setCompletionFilter] = useState('')
    
    // Pagination states
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [orgUnitDetails, setOrgUnitDetails] = useState({})
    const [groupMembers, setGroupMembers] = useState({})
    const orgUnitDetailsRef = useRef(orgUnitDetails)
    orgUnitDetailsRef.current = orgUnitDetails

    // Data query hooks
    const { loading: datasetsLoading, error: datasetsError, data: datasetsData } = useDataQuery(dataSetsQuery)
    const { data: rootOrgData } = useDataQuery(orgUnitRootsQuery)
    const { loading: groupsLoading, error: groupsError, data: groupsData } = useDataQuery(orgUnitGroupsQuery)
    const { loading: userLoading, error: userError, data: userData } = useDataQuery(currentUserQuery)
    const { data: levelsData } = useDataQuery(orgUnitLevelsQuery)
    const { loading: sysLoading, error: sysError, data: sysData } = useDataQuery(systemInfoQuery)
    const runtimeConfig = useConfig()
    const engine = useDataEngine()
    const {
        statuses: orgUnitStatuses,
        loadUnits,
        updateStatus,
        reloadUnit,
        reset: resetStatuses,
    } = useOrgUnitStatusLoader(engine)

    // Sync period state when selectedYear or selectedMonth changes
    useEffect(() => {
        setPeriod(`${selectedYear}${selectedMonth}`)
    }, [selectedYear, selectedMonth])

    const handleReloadStatus = useCallback(
        (orgUnitId) => reloadUnit(orgUnitId, { dataSet: datasetId, period }),
        [reloadUnit, datasetId, period]
    )

    // Set current user
    useEffect(() => {
        if (userData && userData.me) {
            setCurrentUser(userData.me)
        }
    }, [userData])

    // Server version check for 2.40–2.43.1.0 including SNAPSHOT builds
    const serverVersion =
        runtimeConfig?.serverVersion?.full ||
        runtimeConfig?.systemInfo?.version ||
        sysData?.systemInfo?.version
    const versionSupported = isSupportedDhis2Version(runtimeConfig?.serverVersion || serverVersion)

    const levelColumns = useMemo(() => {
        const fromApi = resolveLevelColumns(
            extractCollection(levelsData?.organisationUnitLevels, 'organisationUnitLevels')
        )
        return fromApi.length
            ? fromApi
            : [{ level: null, name: 'Organisation unit' }]
    }, [levelsData])

    const treeRoots = useMemo(() => {
        const assigned = userData?.me?.dataViewOrganisationUnits?.length
            ? userData.me.dataViewOrganisationUnits
            : userData?.me?.organisationUnits
        if (assigned?.length) {
            return assigned.map((unit) => unit.id)
        }
        return extractCollection(rootOrgData?.organisationUnits, 'organisationUnits')
            .map((unit) => unit.id)
    }, [userData, rootOrgData])

    const selectedGroupsKey = selectedGroups.join(',')

    useEffect(() => {
        const missing = selectedGroups.filter((id) => !Object.prototype.hasOwnProperty.call(groupMembers, id))
        if (!missing.length || !engine) {
            return undefined
        }
        let cancelled = false
        engine.query({
            organisationUnitGroups: {
                resource: 'organisationUnitGroups',
                params: {
                    filter: `id:in:[${missing.join(',')}]`,
                    fields: 'id,organisationUnits[id]',
                    paging: false,
                },
            },
        }).then((result) => {
            if (cancelled) {
                return
            }
            const groups = extractCollection(result.organisationUnitGroups, 'organisationUnitGroups')
            setGroupMembers((current) => {
                const next = { ...current }
                groups.forEach((group) => {
                    next[group.id] = (group.organisationUnits || [])
                        .map((unit) => unit.id)
                        .filter(Boolean)
                })
                missing.forEach((id) => {
                    if (!next[id]) {
                        next[id] = []
                    }
                })
                return next
            })
        }).catch((err) => {
            console.error('Could not load organisation unit group members', err)
        })
        return () => {
            cancelled = true
        }
    }, [engine, selectedGroupsKey, selectedGroups, groupMembers])

    const groupMemberIds = useMemo(() => {
        const ids = new Set()
        selectedGroups.forEach((groupId) => {
            ;(groupMembers[groupId] || []).forEach((id) => ids.add(id))
        })
        return [...ids]
    }, [selectedGroups, groupMembers])

    const filteredOrgUnits = useMemo(
        () => groupMemberIds.map((id) => orgUnitDetails[id] || { id }),
        [groupMemberIds, orgUnitDetails]
    )

    // Pre-calculate units that need completion
    const unitsToComplete = useMemo(() => {
        return filteredOrgUnits.filter(ou => {
            const status = orgUnitStatuses[ou.id]
            return status && status.hasData && !status.isCompleted
        })
    }, [filteredOrgUnits, orgUnitStatuses])

    const unitsToCompleteCount = unitsToComplete.length

    const tableFiltersActive = Boolean(dataPresenceFilter || completionFilter)

    const displayedOrgUnits = useMemo(() => {
        if (!tableFiltersActive) {
            return filteredOrgUnits
        }
        return filteredOrgUnits.filter((ou) =>
            matchesTableFilters(orgUnitStatuses[ou.id], dataPresenceFilter, completionFilter)
        )
    }, [filteredOrgUnits, orgUnitStatuses, dataPresenceFilter, completionFilter, tableFiltersActive])

    const unitsPendingStatus = useMemo(() => {
        if (!tableFiltersActive || orgUnit !== 'ALL') {
            return []
        }
        return filteredOrgUnits
            .filter((ou) => !hasKnownStatus(orgUnitStatuses[ou.id]))
            .slice(0, 20)
    }, [tableFiltersActive, orgUnit, filteredOrgUnits, orgUnitStatuses])

    const singleStatus = orgUnit && orgUnit !== 'ALL' ? orgUnitStatuses[orgUnit] : null
    const singleStatusReady = hasKnownStatus(singleStatus)
    const singleUnitMatches =
        !orgUnit ||
        orgUnit === 'ALL' ||
        !tableFiltersActive ||
        !singleStatusReady ||
        matchesTableFilters(singleStatus, dataPresenceFilter, completionFilter)

    useEffect(() => {
        const itemCount = orgUnit === 'ALL' ? displayedOrgUnits.length : (singleUnitMatches ? 1 : 0)
        const maxPage = Math.max(1, Math.ceil(itemCount / pageSize) || 1)
        if (page > maxPage) {
            setPage(maxPage)
        }
    }, [displayedOrgUnits.length, singleUnitMatches, orgUnit, page, pageSize])

    const pagedOrgUnits = useMemo(() => {
        if (orgUnit !== 'ALL') {
            return []
        }
        return displayedOrgUnits.slice((page - 1) * pageSize, page * pageSize)
    }, [orgUnit, displayedOrgUnits, page, pageSize])

    const nextPageOrgUnits = useMemo(() => {
        if (orgUnit !== 'ALL') {
            return []
        }
        return displayedOrgUnits.slice(page * pageSize, (page + 1) * pageSize)
    }, [orgUnit, displayedOrgUnits, page, pageSize])

    const detailIdsKey = useMemo(() => {
        const ids = new Set()
        if (orgUnit && orgUnit !== 'ALL') {
            ids.add(orgUnit)
        }
        if (orgUnit === 'ALL') {
            pagedOrgUnits.forEach((unit) => ids.add(unit.id))
            nextPageOrgUnits.forEach((unit) => ids.add(unit.id))
        }
        return [...ids].join(',')
    }, [orgUnit, pagedOrgUnits, nextPageOrgUnits])

    useEffect(() => {
        const missing = detailIdsKey.split(',').filter((id) => id && !orgUnitDetailsRef.current[id])
        if (!missing.length || !engine) {
            return undefined
        }
        let cancelled = false
        fetchOrgUnitDetails(engine, missing)
            .then((loaded) => {
                if (cancelled || !Object.keys(loaded).length) {
                    return
                }
                setOrgUnitDetails((current) => ({ ...current, ...loaded }))
            })
            .catch((err) => {
                console.error('Could not load organisation unit details', err)
            })
        return () => {
            cancelled = true
        }
    }, [engine, detailIdsKey])

    const pageNeedsFetch = useMemo(() => {
        if (!searchApplied) {
            return false
        }
        if (orgUnit === 'ALL') {
            return pagedOrgUnits.some((ou) => !hasKnownStatus(orgUnitStatuses[ou.id]))
        }
        return Boolean(orgUnit) && !hasKnownStatus(orgUnitStatuses[orgUnit])
    }, [searchApplied, orgUnit, pagedOrgUnits, orgUnitStatuses])

    useEffect(() => {
        if (!searchApplied || !datasetId || !period) {
            return
        }

        const visibleIds =
            orgUnit === 'ALL'
                ? pagedOrgUnits.map((ou) => ou.id)
                : orgUnit
                    ? [orgUnit]
                    : []
        const nextIds = nextPageOrgUnits.map((ou) => ou.id)
        const pendingFilterIds = unitsPendingStatus.map((ou) => ou.id)

        loadUnits(visibleIds, { dataSet: datasetId, period, silent: false })
        if (nextIds.length) {
            loadUnits(nextIds, { dataSet: datasetId, period, silent: true })
        }
        if (pendingFilterIds.length) {
            loadUnits(pendingFilterIds, { dataSet: datasetId, period, silent: true })
        }
    }, [
        searchApplied,
        datasetId,
        period,
        orgUnit,
        pagedOrgUnits,
        nextPageOrgUnits,
        unitsPendingStatus,
        loadUnits,
    ])

    // Early returns for loading/error (correctly placed after all hook declarations)
    const error = datasetsError || userError || groupsError
    if (error) {
        const serverMessage = error.details?.message
        return (
            <div className="app-container">
                <CssVariables colors spacers theme elevations />
                <NoticeBox title="Could not load data from DHIS2" error>
                    {serverMessage || error.message}. Verify that this user can read datasets and organisation units, then reload the app.
                </NoticeBox>
            </div>
        )
    }

    const initialLoading = datasetsLoading || groupsLoading || userLoading
    if (initialLoading) {
        return (
            <div className="app-container">
                <CssVariables colors spacers theme elevations />
                <CenteredContent>
                    <CircularLoader />
                </CenteredContent>
            </div>
        )
    }

    // Predefined lists for Year and Month selections
    const years = []
    for (let y = currentYear; y >= 2015; y--) {
        years.push(String(y))
    }

    const MONTHS = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ]

    // Restrict selection to current month and year or any previous month and year
    const availableMonths = selectedYear === String(currentYear)
        ? MONTHS.filter(m => parseInt(m.value, 10) <= currentMonth)
        : MONTHS

    const handleYearChange = (yearVal) => {
        setSelectedYear(yearVal)
        if (yearVal === String(currentYear)) {
            const curMonthStr = String(currentMonth).padStart(2, '0')
            if (parseInt(selectedMonth, 10) > currentMonth) {
                setSelectedMonth(curMonthStr)
            }
        }
    }

    const allOrgUnitGroups = extractCollection(
        groupsData?.organisationUnitGroups,
        'organisationUnitGroups'
    )
    const allDataSets = extractCollection(datasetsData?.dataSets, 'dataSets')
        .filter((dataSet) => !dataSet.periodType || dataSet.periodType === 'Monthly')

    const handleApply = () => {
        if (!period.trim()) {
            alert('Please select a reporting period')
            return
        }
        if (!datasetId.trim()) {
            alert('Please select a dataset')
            return
        }
        if (!orgUnit.trim()) {
            alert('Please select an Organisation Unit')
            return
        }
        setPage(1)
        setDataPresenceFilter('')
        setCompletionFilter('')
        resetStatuses()
        setSearchApplied(true)
    }

    const handleMarkAllComplete = async () => {
        if (unitsToCompleteCount === 0) {
            alert('No units found with data that are not already complete.')
            return
        }

        if (!confirm(`Are you sure you want to mark complete ${unitsToCompleteCount} units?`)) {
            return
        }

        for (const ou of unitsToComplete) {
            try {
                await engine.mutate({
                    resource: 'completeDataSetRegistrations',
                    type: 'create',
                    data: {
                        completeDataSetRegistrations: [
                            buildCompleteRegistration({
                                dataSet: datasetId,
                                period,
                                organisationUnit: ou.id,
                                storedBy: getUsername(currentUser),
                            })
                        ]
                    }
                })
                updateStatus(ou.id, {
                    hasData: true,
                    isCompleted: true,
                    completedBy: getUsername(currentUser),
                    dateCompleted: new Date().toISOString(),
                    loading: false,
                    error: null,
                })
            } catch (err) {
                console.error(`Failed to complete for ${ou.displayName}:`, err)
            }
        }
        alert('Completed marking all units.')
    }

    const handleReset = () => {
        setSelectedYear(String(currentYear))
        setSelectedMonth(String(currentMonth).padStart(2, '0'))
        setDatasetId('')
        setDatasetName('')
        setOrgUnit('')
        setOrgUnitName('')
        setOrgUnitPath('')
        setSelectedGroups([])
        setSearchApplied(false)
        resetStatuses()
        setDataPresenceFilter('')
        setCompletionFilter('')
        setPage(1)
    }

    const handleOrgUnitSelect = (id, displayName, path = '') => {
        setOrgUnit(id)
        setOrgUnitName(displayName)
        setOrgUnitPath(path)
    }

    const handleTreeSelect = ({ id, displayName, path, checked }) => {
        if (!checked) {
            handleOrgUnitSelect('', '', '')
            return
        }
        handleOrgUnitSelect(id, displayName || id, path || '')
    }

    const handleSelectAllOrgUnits = () => {
        handleOrgUnitSelect(
            'ALL',
            selectedGroups.length > 0
                ? 'All units in selected groups'
                : 'All organisation units',
            ''
        )
    }

    const handleDatasetSelect = (id, displayName) => {
        setDatasetId(id)
        setDatasetName(displayName)
    }

    // Label of selected groups to display in summary
    const orgUnitGroupsLabel = selectedGroups
        .map(id => allOrgUnitGroups.find(g => g.id === id)?.displayName || id)
        .join(', ')

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    const buildExportRow = (ou, index, datasetLabel) => {
        const status = orgUnitStatuses[ou?.id] || {}
        return {
            sn: index,
            datasetName: datasetLabel,
            levelValues: levelColumns.map((column) => valueAtLevel(ou, column.level)),
            presence: status.hasData ? 'Has Data' : (status.hasData === false ? 'No Data' : 'Loading...'),
            status: status.isCompleted ? 'Complete' : (status.isCompleted === false ? 'Not Complete' : 'Loading...'),
            completedBy: status.completedBy || '—',
        }
    }

    const handleExport = async (type) => {
        const exportIds = orgUnit === 'ALL'
            ? displayedOrgUnits.map((unit) => unit.id)
            : orgUnit
                ? [orgUnit]
                : []
        let details = orgUnitDetails
        const missing = exportIds.filter((id) => !details[id])
        if (missing.length) {
            try {
                const loaded = await fetchOrgUnitDetails(engine, missing)
                details = { ...details, ...loaded }
                setOrgUnitDetails(details)
            } catch (err) {
                console.error('Could not load organisation unit details for export', err)
            }
        }

        const dataRows = []

        if (orgUnit === 'ALL') {
            displayedOrgUnits.forEach((ou, index) => {
                const ds = allDataSets.find(d => d.id === datasetId)
                dataRows.push(buildExportRow(details[ou.id] || ou, index + 1, ds?.displayName || ''))
            })
        } else if (singleUnitMatches) {
            dataRows.push(buildExportRow(
                details[orgUnit] || { id: orgUnit, displayName: orgUnitName },
                1,
                datasetName
            ))
        }

        if (type === 'xlsx' || type === 'csv') {
            const headers = [
                'S/N',
                'Dataset Name',
                ...levelColumns.map((column) => column.name),
                'Data Presence',
                'Completion Status',
                'Completed By',
            ]
            const aoa = [headers]
            dataRows.forEach(row => {
                aoa.push([
                    row.sn,
                    row.datasetName,
                    ...row.levelValues,
                    row.presence,
                    row.status,
                    row.completedBy
                ])
            })

            const ws = XLSX.utils.aoa_to_sheet(aoa)
            const wb = XLSX.utils.book_new()
            
            if (type === 'xlsx') {
                XLSX.utils.book_append_sheet(wb, ws, 'Dataset Completion Report')
                XLSX.writeFile(wb, `Dataset_Completion_Report_${period}.xlsx`)
            } else {
                const csvContent = XLSX.utils.sheet_to_csv(ws)
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.setAttribute('href', url)
                link.setAttribute('download', `Dataset_Completion_Report_${period}.csv`)
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
        } else if (type === 'pdf') {
            const printWindow = window.open('', '_blank')
            if (!printWindow) {
                alert('Pop-up blocker is preventing PDF generation. Please allow pop-ups for this site.')
                return
            }

            const formattedDate = new Date().toLocaleString()
            const creator = currentUser?.displayName || 'System User'
            const groupsLabel = selectedGroups.length > 0 ? orgUnitGroupsLabel : 'All Groups'

            const levelHeaderHtml = levelColumns
                .map((column) => `<th>${escapeHtml(column.name)}</th>`)
                .join('')

            let tableHtml = ''
            dataRows.forEach(row => {
                const levelCells = row.levelValues
                    .map((value) => `<td>${escapeHtml(value)}</td>`)
                    .join('')
                tableHtml += `
                    <tr>
                        <td style="text-align: center;">${row.sn}</td>
                        <td>${escapeHtml(row.datasetName)}</td>
                        ${levelCells}
                        <td style="font-weight: 500; color: ${row.presence === 'Has Data' ? '#d97706' : '#64748b'}">${escapeHtml(row.presence)}</td>
                        <td style="font-weight: 600; color: ${row.status === 'Complete' ? '#16a34a' : '#dc2626'}">${escapeHtml(row.status)}</td>
                        <td>${escapeHtml(row.completedBy)}</td>
                    </tr>
                `
            })

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Dataset Completion Report - ${period}</title>
                    <style>
                        @page {
                            size: A4 landscape;
                            margin: 12mm 15mm;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            color: #1e293b;
                            margin: 0;
                            padding: 0;
                            font-size: 11px;
                            line-height: 1.4;
                        }
                        .header {
                            border-bottom: 2px solid #0f172a;
                            padding-bottom: 12px;
                            margin-bottom: 20px;
                        }
                        .title-container {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                        }
                        .title-main {
                            font-size: 20px;
                            font-weight: 700;
                            color: #0f172a;
                            margin: 0 0 4px 0;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        .title-sub {
                            font-size: 13px;
                            font-weight: 500;
                            color: #475569;
                            margin: 0;
                        }
                        .metadata-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 15px;
                            background-color: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            padding: 12px;
                            margin-bottom: 20px;
                        }
                        .metadata-item {
                            display: flex;
                            flex-direction: column;
                        }
                        .metadata-label {
                            font-size: 9px;
                            text-transform: uppercase;
                            color: #64748b;
                            font-weight: 600;
                            margin-bottom: 2px;
                        }
                        .metadata-value {
                            font-size: 11px;
                            font-weight: 600;
                            color: #334155;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        th {
                            background-color: #0f172a;
                            color: #ffffff;
                            font-weight: 600;
                            text-transform: uppercase;
                            font-size: 9px;
                            letter-spacing: 0.5px;
                            padding: 8px 10px;
                            border: 1px solid #0f172a;
                            text-align: left;
                        }
                        td {
                            padding: 8px 10px;
                            border: 1px solid #e2e8f0;
                            word-break: break-word;
                        }
                        tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        .footer {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            display: flex;
                            justify-content: space-between;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 8px;
                            font-size: 9px;
                            color: #64748b;
                        }
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .footer {
                                position: fixed;
                                bottom: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title-container">
                            <div>
                                <h1 class="title-main">Dataset Completion Report</h1>
                                <h2 class="title-sub">DHIS2 Health Information Management System</h2>
                            </div>
                        </div>
                    </div>

                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <span class="metadata-label">Dataset</span>
                            <span class="metadata-value">${escapeHtml(datasetName)}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Reporting Period</span>
                            <span class="metadata-value">${period}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Groups Filter</span>
                            <span class="metadata-value">${escapeHtml(groupsLabel)}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Organisation Unit</span>
                            <span class="metadata-value">${escapeHtml(orgUnitName)}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">S/N</th>
                                <th>Dataset Name</th>
                                ${levelHeaderHtml}
                                <th style="width: 90px;">Data Presence</th>
                                <th style="width: 100px;">Status</th>
                                <th style="width: 120px;">Completed By</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        <span>Generated by: <b>${creator}</b> | Date: ${formattedDate}</span>
                        <span>Dataset Completion Checker</span>
                    </div>

                    <script>
                        window.focus();
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
                </html>
            `)
            printWindow.document.close()
        }
    }

    const totalItems = orgUnit === 'ALL' ? displayedOrgUnits.length : (singleUnitMatches ? 1 : 0)
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
    const analyzedCount = orgUnit === 'ALL' ? filteredOrgUnits.length : 1

    return (
        <div className="app-container">
            <CssVariables colors spacers theme elevations />

            {serverVersion && !versionSupported && (
                <NoticeBox title="DHIS2 version warning" warning>
                    This app supports DHIS2 {SUPPORTED_DHIS2_RANGE_LABEL}. Detected server version: {serverVersion}.
                </NoticeBox>
            )}

            <Card>
                <div className="card-body">
                    <div className="search-grid">
                        <SingleSelectField
                            label="Year"
                            selected={selectedYear}
                            onChange={({ selected }) => handleYearChange(selected)}
                            dense
                        >
                            {years.map((y) => (
                                <SingleSelectOption key={y} value={y} label={y} />
                            ))}
                        </SingleSelectField>

                        <SingleSelectField
                            label="Month"
                            selected={selectedMonth}
                            onChange={({ selected }) => setSelectedMonth(selected)}
                            dense
                        >
                            {availableMonths.map((m) => (
                                <SingleSelectOption key={m.value} value={m.value} label={m.label} />
                            ))}
                        </SingleSelectField>

                        <SingleSelectField
                            label="Dataset"
                            selected={datasetId}
                            onChange={({ selected }) => {
                                const ds = allDataSets.find((item) => item.id === selected)
                                handleDatasetSelect(selected, ds?.displayName || '')
                            }}
                            placeholder="Choose a dataset"
                            filterable
                            dense
                        >
                            {allDataSets.map((ds) => (
                                <SingleSelectOption key={ds.id} value={ds.id} label={ds.displayName} />
                            ))}
                        </SingleSelectField>

                        <MultiSelectField
                            label="Organisation unit groups"
                            selected={selectedGroups}
                            onChange={({ selected }) => {
                                setSelectedGroups(selected)
                                setOrgUnit('')
                                setOrgUnitName('')
                                setOrgUnitPath('')
                            }}
                            placeholder="All groups"
                            clearable
                            filterable
                            dense
                        >
                            {allOrgUnitGroups.map((group) => (
                                <MultiSelectOption
                                    key={group.id}
                                    value={group.id}
                                    label={group.displayName}
                                />
                            ))}
                        </MultiSelectField>

                        <div className="search-actions">
                            <ButtonStrip>
                                <Button primary onClick={handleApply}>
                                    Analyze datasets
                                </Button>
                                {searchApplied && (
                                    <Button secondary onClick={handleReset}>
                                        Clear
                                    </Button>
                                )}
                            </ButtonStrip>
                        </div>
                    </div>
                    <OrgUnitSelect
                        roots={treeRoots}
                        selectedId={orgUnit}
                        selectedPath={orgUnitPath}
                        selectedName={orgUnitName}
                        showSelectAll={selectedGroups.length > 0}
                        selectAllCount={filteredOrgUnits.length}
                        onSelect={handleTreeSelect}
                        onSelectAll={handleSelectAllOrgUnits}
                    />
                </div>
            </Card>

            {!searchApplied && (
                <NoticeBox title="How to use this app" info>
                    Select a year, month, monthly dataset and an organisation unit from the tree, then click Analyze datasets.
                    Organisation unit groups limit the “all units” option. After analyzing, use Data presence
                    and Completion status to narrow the table, export the report, or mark datasets complete or incomplete.
                </NoticeBox>
            )}

            {searchApplied && (
                <Card>
                    <div className="card-body">
                        <div className="results-toolbar">
                            <h2 className="results-title">Dataset Completion Details</h2>
                            <ButtonStrip>
                                <DropdownButton
                                    component={
                                        <FlyoutMenu>
                                            <MenuItem label="Download as Excel (.xlsx)" onClick={() => handleExport('xlsx')} />
                                            <MenuItem label="Download as CSV (.csv)" onClick={() => handleExport('csv')} />
                                            <MenuItem label="Download as PDF (.pdf)" onClick={() => handleExport('pdf')} />
                                        </FlyoutMenu>
                                    }
                                    secondary
                                    small
                                >
                                    Export report
                                </DropdownButton>
                                {orgUnit === 'ALL' && (
                                    <Button
                                        primary
                                        onClick={handleMarkAllComplete}
                                        small
                                        disabled={unitsToCompleteCount === 0}
                                    >
                                        {unitsToCompleteCount > 0
                                            ? `Mark all complete (${unitsToCompleteCount})`
                                            : 'Mark all complete'}
                                    </Button>
                                )}
                            </ButtonStrip>
                        </div>
                        <p className="results-meta">
                            Dataset: {datasetName} | Period: {period}
                            {selectedGroups.length > 0 ? ` | Groups: ${orgUnitGroupsLabel}` : ''}
                            {` | Organisation unit: ${orgUnitName}`}
                        </p>

                        <div className="table-filters">
                            <SingleSelectField
                                label="Data presence"
                                selected={dataPresenceFilter}
                                onChange={({ selected }) => {
                                    setDataPresenceFilter(selected || '')
                                    setPage(1)
                                }}
                                placeholder="All"
                                clearable
                                dense
                            >
                                {DATA_PRESENCE_OPTIONS.map((option) => (
                                    <SingleSelectOption
                                        key={option.value}
                                        value={option.value}
                                        label={option.label}
                                    />
                                ))}
                            </SingleSelectField>
                            <SingleSelectField
                                label="Completion status"
                                selected={completionFilter}
                                onChange={({ selected }) => {
                                    setCompletionFilter(selected || '')
                                    setPage(1)
                                }}
                                placeholder="All"
                                clearable
                                dense
                            >
                                {COMPLETION_OPTIONS.map((option) => (
                                    <SingleSelectOption
                                        key={option.value}
                                        value={option.value}
                                        label={option.label}
                                    />
                                ))}
                            </SingleSelectField>
                            {tableFiltersActive && (
                                <p className="table-filter-summary">
                                    {orgUnit === 'ALL'
                                        ? `Showing ${displayedOrgUnits.length} of ${analyzedCount} organisation units`
                                        : singleUnitMatches
                                            ? 'Showing 1 matching record'
                                            : 'No records match the selected filters'}
                                </p>
                            )}
                        </div>

                        <div className="results-table">
                            {pageNeedsFetch && (
                                <div className="table-page-loader">
                                    <LinearLoader />
                                </div>
                            )}
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCellHead>S/N</TableCellHead>
                                        <TableCellHead>Dataset name</TableCellHead>
                                        {levelColumns.map((column) => (
                                            <TableCellHead key={column.level ?? column.name}>{column.name}</TableCellHead>
                                        ))}
                                        <TableCellHead>Data presence</TableCellHead>
                                        <TableCellHead>Completion status</TableCellHead>
                                        <TableCellHead>Completed by</TableCellHead>
                                        <TableCellHead>Action</TableCellHead>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {orgUnit === 'ALL' ? (
                                        pagedOrgUnits.length > 0 ? (
                                            pagedOrgUnits.map((ou, index) => (
                                                <DatasetRow
                                                    key={ou.id}
                                                    serialNumber={(page - 1) * pageSize + index + 1}
                                                    levelValues={levelColumns.map((column) => valueAtLevel(ou, column.level))}
                                                    columnCount={6 + levelColumns.length}
                                                    dataset={allDataSets.find(ds => ds.id === datasetId)}
                                                    period={period}
                                                    orgUnit={ou.id}
                                                    currentUser={currentUser}
                                                    cachedStatus={orgUnitStatuses[ou.id]}
                                                    onReloadStatus={handleReloadStatus}
                                                />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={String(6 + levelColumns.length)}>
                                                    {unitsPendingStatus.length > 0
                                                        ? 'Loading records that match the selected filters...'
                                                        : tableFiltersActive
                                                            ? 'No organisation units match the selected data presence and completion filters.'
                                                            : 'No organisation units to display.'}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    ) : singleUnitMatches ? (
                                        allDataSets.filter(ds => ds.id === datasetId).map(ds => {
                                            const ouDetails = orgUnitDetails[orgUnit]
                                            return (
                                                <DatasetRow
                                                    key={ds.id}
                                                    serialNumber={1}
                                                    levelValues={levelColumns.map((column) => valueAtLevel(
                                                        ouDetails || { displayName: orgUnitName },
                                                        column.level
                                                    ))}
                                                    columnCount={6 + levelColumns.length}
                                                    dataset={ds}
                                                    period={period}
                                                    orgUnit={orgUnit}
                                                    currentUser={currentUser}
                                                    cachedStatus={orgUnitStatuses[orgUnit]}
                                                    onReloadStatus={handleReloadStatus}
                                                />
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={String(6 + levelColumns.length)}>
                                                No records match the selected data presence and completion filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {orgUnit === 'ALL' && (
                            <div className="pagination-wrap">
                                <Pagination
                                    page={page}
                                    pageSize={pageSize}
                                    pageCount={pageCount}
                                    total={totalItems}
                                    onPageChange={(newPage) => setPage(newPage)}
                                    onPageSizeChange={(newPageSize) => {
                                        setPageSize(Number(newPageSize))
                                        setPage(1)
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}

export default App
