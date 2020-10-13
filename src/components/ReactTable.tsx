/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Row, Column, useTable, useFilters, useSortBy, usePagination } from 'react-table'
export { Column } from 'react-table'
import { QueryBuilder } from 'objection'
import DatePicker from 'react-datepicker'
import { dateFormatString as dfs, toDateOnly, parseISO } from '../core'

// This is some integration magic
// If a row has .id, use that as the unique id.
function getRowId<D extends {id?: any}>(row: D, relativeIndex: number, parent: Row<D> | undefined) {
    const id = row.id !== undefined ? row.id : relativeIndex
    return parent ? [parent.id, id].join('.') : id
}

export type SortBy = {
    id: string
    desc: boolean
}

export type Filter = {
    id: string
    value: string
}

type State = {
    pageSize: number
    pageIndex: number
    sortBy: SortBy[]
    filters?: Filter[],
}

type Props<D extends object> = {
    columns: Column<D>[],
    data: D[],
    fetchData: (state: State) => void,
    pageCount: number,
    initialState?: State
    className?: string
    style?: object
}

export function ReactTable<D extends object>(props: Props<D>) {
    const defaultColumn = React.useMemo(() => ({
        Filter: InputFilter,
        disableFilters: true,
    }), [])

    const table = useTable<D>({
        columns: props.columns,
        data: props.data,
        defaultColumn,
        initialState: props.initialState,
        manualFilters: true,
        manualSortBy: true,
        disableSortRemove: true,
        manualPagination: true,
        pageCount: props.pageCount,
        getRowId: getRowId,
    } as any, useFilters, useSortBy, usePagination)
    const { canPreviousPage, canNextPage, pageOptions, pageCount, gotoPage,
        nextPage, previousPage, setPageSize, 
        state: { pageIndex, pageSize, sortBy, filters },
    } = table as any

    React.useEffect(() => {
        props.fetchData(table.state as State)
    }, [props.fetchData, pageSize, pageIndex, sortBy, filters])

    const { className, style } = props
    const tablePane = <table className={className} style={style} {...table.getTableProps()}>
        <thead>
        {table.headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
                <th className={`column-${column.id}`} {...column.getHeaderProps()}>
                    <div {...(column as any).getSortByToggleProps()}>
                        <span className="heading">
                            {column.render('Header')}
                        </span>
                        <span className="sortBy">
                            {(column as any).isSorted ?
                                (column as any).isSortedDesc ? ' 🔽' : ' 🔼'
                            : ''}
                        </span>
                    </div>
                    {(column as any).canFilter && <div className="filter">{column.render('Filter')}</div>}
                </th>
            ))}
            </tr>
        ))}
        </thead>
        <tbody {...table.getTableBodyProps()}>
        {table.rows.length == 0 &&
            <tr>
                <td colSpan={table.columns.length}>No items</td>
            </tr>
        }
        {table.rows.map(row => {
            table.prepareRow(row)
            return (
            <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                return (
                    <td className={`column-${cell.column.id}`} {...cell.getCellProps()}>
                    {cell.render('Cell')}
                    </td>
                )
                })}
            </tr>
            )
        })}
        </tbody>
    </table>

    const paginationPane = props.pageCount > 0 ? <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {'<<'}
        </button>&nbsp;
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
            {'<'}
        </button>&nbsp;
        <button onClick={() => nextPage()} disabled={!canNextPage}>
            {'>'}
        </button>&nbsp;
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            {'>>'}
        </button>&nbsp;
        <span>Page {pageIndex + 1} of {pageOptions.length}</span>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <span>
            <label>Go to page:</label>
            <input
                defaultValue={pageIndex + 1}
                onChange={e => {
                    const page = e.target.value ? Number(e.target.value) - 1 : 0
                    gotoPage(page)
                }}
            />
        </span>
        &nbsp;
        <select value={pageSize} onChange={e => {setPageSize(Number(e.target.value))}}>
            {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
                Show {pageSize}
            </option>
            ))}
        </select>
    </div> : null

    return <>
        {tablePane}
        {paginationPane}
    </>
}

export function InputFilter(table: {column: {filterValue: string, setFilter: any}}) {
    return <input
        value={table.column.filterValue || ''}
        onChange={e => {
            table.column.setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
        }}
        placeholder={`Search`}
    />
}

export function SelectFilter(table: {column: {filterValue: string, setFilter: any}}) {
    return <select
        value={table.column.filterValue || ''}
        onChange={e => {
            table.column.setFilter(e.target.value || undefined) // Set undefined to remove the filter entirely
        }}
    >
        {(table.column as any).FilterOptions}
    </select>
}

export function DateRangeFilter(table: {column: {filterValue: string, setFilter: any}}) {
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const parsedStartDate = startDate ? parseISO(startDate) : null
    const parsedEndDate = endDate ? parseISO(endDate) : null

    return <>
        <div>
            <DatePicker
                selected={parsedStartDate}
                onChange={(date: Date) => {
                    const dateOnly = date ? toDateOnly(date) : ''
                    setStartDate(dateOnly)
                    table.column.setFilter([dateOnly, endDate])
                }}
                selectsStart
                startDate={parsedStartDate}
                endDate={parsedEndDate}
                placeholderText='From'
                isClearable
                dateFormat={dfs()}
            />
        </div><div>
            <DatePicker
                selected={parsedEndDate}
                onChange={(date: Date) => {
                    const dateOnly = date ? toDateOnly(date) : ''
                    setEndDate(dateOnly)
                    table.column.setFilter([startDate, dateOnly])
                }}
                selectsEnd
                startDate={parsedStartDate}
                endDate={parsedEndDate}
                placeholderText='To'
                isClearable
                dateFormat={dfs()}
            />
        </div>
    </>
}

export function filterQuery(q: QueryBuilder<any>, f: Filter, table?: string) {
    const field = table ? `${table}.${f.id}` : f.id
    switch (f.id) {
        case 'id':
            const n = Number(f.value)
            if (!Number.isNaN(n)) {
                q.where(field, n)
            }
            break
        case 'date':
            if (f.value[0]) {
                q.where(field, '>=', f.value[0])
            }
            if (f.value[1]) {
                q.where(field, '<=', f.value[1])
            }
            break
        case 'type':
            if (Array.isArray(f.value)) {
                q.whereIn(field, f.value)
            }
            else {
                q.where(field, f.value)
            }
            break
        default:
            q.where(field, 'like', `%${f.value}%`)
            break    
    }
}

// Apply commonly used sorting to a query
export function sortQuery(q: any, sortBy: SortBy[]) {
    q.orderBy(sortBy.map((s: {id: string, desc: boolean}) => ({
        column: s.id, order: s.desc ? 'desc' : 'asc'
    })))
    return q
}

export default ReactTable
