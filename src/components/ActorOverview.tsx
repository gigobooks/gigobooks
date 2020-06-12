import * as React from 'react'
import { Actor } from '../core'
import styled from 'styled-components'
import { Column, ReactTable, filterQueries, sortQuery, ActorSelectFilter } from './ReactTable'
import { Link } from 'react-router-dom'

function LinkToItem(data: any) {
    return <Link to={`/${data.row.values.type}s/${data.cell.row.id}`}>{data.cell.value}</Link>
}

export default function ActorOverview() {
    const columns = React.useMemo<Column<Actor>[]>(() => [
        { Header: 'ID', accessor: 'id', disableFilters: false, Cell: LinkToItem },
        { Header: 'Name', accessor: 'title', disableFilters: false, Cell: LinkToItem },
        { Header: 'Type', accessor: 'type', disableFilters: false, Filter: ActorSelectFilter },
        { Header: 'Tax id', accessor: 'taxId', Cell: LinkToItem },
    ], [])
    const initialState = React.useMemo(() => ({
        pageIndex: 0, pageSize: 10, sortBy: [{id: 'id', desc: false}],
    }), [])
    const [data, setData] = React.useState<Actor[]>([])
    const [pageCount, setPageCount] = React.useState<number>(0)

    const fetchData = React.useCallback(state => {
        const c = Actor.query()
        const q = Actor.query()

        filterQueries(state, [c, q])
        sortQuery(state, q)

        c.resultSize().then(total => {
            setPageCount(Math.ceil(total / state.pageSize))
        })

        q.offset(state.pageSize * state.pageIndex).limit(state.pageSize).then(data => {
            setData(data)
        })
    }, [])

    return <div>
        <h1>List of customers and suppliers</h1>
        <Link to={`customers/new`}>New customer</Link> - <Link to={`suppliers/new`}>New supplier</Link>
        <Styles>
            <ReactTable {...{columns, data, fetchData, pageCount, initialState}} />
        </Styles>
    </div>
}

const Styles = styled.div`
table {
    border: solid 1px blue;

    th {
        border-bottom: solid 3px red;
        background: aliceblue;
        color: black;
        font-weight: bold;
    }

    td {
        padding: 10px;
        border: solid 1px gray;
        background: papayawhip;
    }
}
`
