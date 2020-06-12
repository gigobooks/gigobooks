import * as React from 'react'
import { Row, Column, useTable, useFilters, useSortBy, usePagination } from 'react-table'
export { Column } from 'react-table'
import { QueryBuilder } from 'objection'

// This is some integration magic
// If a row has .id, use that as the unique id.
function getRowId<D extends {id?: any}>(row: D, relativeIndex: number, parent: Row<D> | undefined) {
    const id = row.id !== undefined ? row.id : relativeIndex
    return parent ? [parent.id, id].join('.') : id
}

type State = {
    pageSize: number
    pageIndex: number
    sortBy: {id: string, desc: boolean}[]
    filters?: {id: string, value: string}[],
}

type Props<D extends object> = {
    columns: Column<D>[],
    data: D[],
    fetchData: (state: State) => void,
    pageCount: number,
    initialState?: State
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

    const tablePane = <table {...table.getTableProps()}>
        <thead>
        {table.headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>
                    <div {...(column as any).getSortByToggleProps()}>
                        {column.render('Header')}
                        <span>
                            {(column as any).isSorted ?
                                (column as any).isSortedDesc ? ' 🔽' : ' 🔼'
                            : ''}
                        </span>
                    </div>
                    {(column as any).canFilter && <div>{column.render('Filter')}</div>}
                </th>
            ))}
            </tr>
        ))}
        </thead>
        <tbody {...table.getTableBodyProps()}>
        {table.rows.map(row => {
            table.prepareRow(row)
            return (
            <tr {...row.getRowProps()}>
                {row.cells.map(cell => {
                return (
                    <td {...cell.getCellProps()}>
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
        &nbsp;|&nbsp;
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

// Apply commonly used filters to a list of queries (usually query and count query pair)
export function filterQueries(state: State, queries: QueryBuilder<any>[]) {
    if (state.filters) {
        state.filters.forEach((f: {id: string, value: string}) => {
            switch (f.id) {
                case 'id':
                    const n = Number(f.value)
                    if (!Number.isNaN(n)) {
                        queries.forEach(q => q.where('id', n))
                    }
                    break
                case 'type':
                    if (Array.isArray(f.value)) {
                        queries.forEach(q => q.whereIn('type', f.value))
                    }
                    else {
                        queries.forEach(q => q.where('type', f.value))
                    }
                    break
                default:
                    queries.forEach(q => q.where(f.id, 'like', `%${f.value}%`))
                    break    
            }
        })
    }
}

// Apply commonly used sorting to a query
export function sortQuery(state: State, q: any) {
    q.orderBy(state.sortBy.map((s: {id: string, desc: boolean}) => ({
        column: s.id, order: s.desc ? 'desc' : 'asc'
    })))
    return q
}

export default ReactTable
