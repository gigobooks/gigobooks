import * as React from 'react'
import { Transaction, TransactionType } from '../core'
import styled from 'styled-components'
import { Column, ReactTable, filterQueries, sortQuery } from './ReactTable'
import { Link } from 'react-router-dom'

type Props = {
    path: string
}

function LinkToRawTransaction(data: any) {
    const url = `/transactions/${data.row.values.id}`
    return <Link to={url}>{url}</Link>
}

function LinkToTransaction(data: any) {
    const type = data.row.values.type
    if (type == '' || type.isEnum(TransactionType)) {
        const url = `/${(type && type != Transaction.Raw) ? type : 'transaction'}s/${data.cell.row.id}`
        return <Link to={url}>{data.cell.value}</Link>    
    }
    else {
        return data.cell.value
    }
}

export default function TransactionOverview(props: Props) {
    const columns = React.useMemo<Column<Transaction>[]>(() => [
        { Header: 'Id', accessor: 'id', disableFilters: false, Cell: LinkToTransaction },
        { Header: 'Date', accessor: 'date', Cell: LinkToTransaction },
        { Header: 'Description', accessor: 'description', disableFilters: false, Cell: LinkToTransaction },
        { Header: 'Type', accessor: 'type', Cell: LinkToTransaction },
        { Header: 'Raw link', id: 'raw-link', Cell: LinkToRawTransaction },
    ], [])
    const initialState = React.useMemo(() => ({
        pageIndex: 0, pageSize: 10, sortBy: [{id: 'date', desc: true}],
    }), [])
    const [data, setData] = React.useState<Transaction[]>([])
    const [pageCount, setPageCount] = React.useState<number>(0)

    const fetchData = React.useCallback(state => {
        const c = Transaction.query()
        const q = Transaction.query()

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
        <h1>List of transactions</h1>
        <Link to={`${props.path}/new`}>New raw transaction</Link>
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
