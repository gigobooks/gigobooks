import * as React from 'react'
import * as RT from 'react-table'

// This is some integration magic
// If a row has .id, use that as the unique id.
export function getRowId(row: { id?: any }, relativeIndex: number, parent: { id?: any }) {
    const id = row.id !== undefined ? row.id : relativeIndex
    return parent ? [parent.id, id].join('.') : id
}

export function ReactTable(props: RT.UseTableInstanceProps<any>) {
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = props

    return <table {...getTableProps()}>
        <thead>
        {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>
                {column.render('Header')}
                </th>
            ))}
            </tr>
        ))}
        </thead>
        <tbody {...getTableBodyProps()}>
        {rows.map(row => {
            prepareRow(row)
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
