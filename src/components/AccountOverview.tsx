import * as React from 'react'
import { Account } from '../core'
import { Column, ReactTable, filterQuery, Filter, sortQuery } from './ReactTable'
import { Link } from 'react-router-dom'

function LinkToItem(data: any) {
    return <Link to={`/accounts/${data.cell.row.id}`}>{data.cell.value}</Link>
}

function RenderType(data: any) {
    const info = Account.TypeInfo[data.cell.value]
    return info ? info.label : data.cell.value
}

export default function AccountOverview() {
    const columns = React.useMemo<Column<Account>[]>(() => [
        { Header: 'ID', accessor: 'id', Cell: LinkToItem },
        { Header: 'Title', accessor: 'title', disableFilters: false, Cell: LinkToItem },
        { Header: 'Type', accessor: 'type', Cell: RenderType },
    ], [])
    const initialState = React.useMemo(() => ({
        pageIndex: 0, pageSize: 10, sortBy: [{id: 'id', desc: false}],
    }), [])
    const [data, setData] = React.useState<Account[]>([])
    const [pageCount, setPageCount] = React.useState<number>(0)

    const fetchData = React.useCallback(state => {
        const q = Account.query()
        if (state.filters) {
            state.filters.forEach((f: Filter) => filterQuery(q, f))
        }
    
        q.clone().resultSize().then(total => {
            setPageCount(Math.ceil(total / state.pageSize))
        })

        sortQuery(q, state.sortBy)
        q.offset(state.pageSize * state.pageIndex).limit(state.pageSize).then(data => {
            setData(data)
        })
    }, [])

    return <div>
        <h1>
            <span className='title'>
                List of accounts
            </span>
        </h1>
        <ReactTable className='data-table' {...{columns, data, fetchData, pageCount, initialState}} />
    </div>
}
