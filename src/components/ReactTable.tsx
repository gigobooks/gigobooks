import * as React from 'react'
import { Row, Column, useTable, usePagination } from 'react-table'
export { Column } from 'react-table'

// This is some integration magic
// If a row has .id, use that as the unique id.
function getRowId<D extends {id?: any}>(row: D, relativeIndex: number, parent: Row<D> | undefined) {
    const id = row.id !== undefined ? row.id : relativeIndex
    return parent ? [parent.id, id].join('.') : id
}

type Props<D extends object> = {
    columns: Column<D>[],
    data: D[],
    fetchData: (options: {
        pageSize: number
        pageIndex: number
    }) => void,
    pageCount: number,
}

export function ReactTable<D extends object>(props: Props<D>) {
    const table = useTable({
        columns: props.columns,
        data: props.data,
        initialState: { pageIndex: 0 },
        manualPagination: true,
        pageCount: props.pageCount,
        getRowId: getRowId,
    } as any, usePagination)
    const state: {pageSize: number, pageIndex: number} = table.state as any

    React.useEffect(() => {
        props.fetchData({pageSize: state.pageSize, pageIndex: state.pageIndex})
    }, [props.fetchData, state.pageSize, state.pageIndex])

    return <table {...table.getTableProps()}>
        <thead>
        {table.headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>
                {column.render('Header')}
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
}

export default ReactTable
