import * as React from 'react'
import { Transaction, TransactionType } from '../core'
import styled from 'styled-components'
import { Column, ReactTable, filterQuery, Filter, sortQuery, SelectFilter } from './ReactTable'
import { Link } from 'react-router-dom'

const TransactionTypeOptions = <>
    <option key='all' value=''>All</option>
    {Object.keys(Transaction.TypeInfo).map(key =>
        <option key={key} value={key}>{Transaction.TypeInfo[key].label}</option>)}
</>

function LinkToRawTransaction(data: any) {
    const url = `/transactions/${data.row.values.id}`
    return <Link to={url}>view raw</Link>
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

function RenderType(data: any) {
    const info = Transaction.TypeInfo[data.cell.value]
    return info ? info.label : data.cell.value
}

type Props = {
    types: TransactionType[],
    viewRaw?: boolean,
    actorHeading?: string
}

function TransactionTable({types, viewRaw = false, actorHeading = 'Customer / Supplier'}: Props) {
    const columns = React.useMemo<Column<Transaction>[]>(() => {
        const columns: any = [
            { Header: 'Id', accessor: 'id', disableFilters: false, Cell: LinkToTransaction },
            { Header: 'Date', accessor: 'date', Cell: LinkToTransaction },
            { Header: 'Description', accessor: 'description', disableFilters: false, Cell: LinkToTransaction },
            { Header: 'Type', accessor: 'type', disableFilters: types.length > 0, 
                Filter: SelectFilter, FilterOptions: TransactionTypeOptions, Cell: RenderType },
            { Header: actorHeading, accessor: 'actorTitle', disableFilters: false, Cell: LinkToTransaction },
        ]
        if (viewRaw) {
            columns.push({ Header: 'View raw', id: 'raw-link', Cell: LinkToRawTransaction })
        }
        return columns
    }, [types, viewRaw, actorHeading])

    const initialState = React.useMemo(() => ({
        pageIndex: 0, pageSize: 10, sortBy: [{id: 'date', desc: true}],
    }), [])
    const [data, setData] = React.useState<Transaction[]>([])
    const [pageCount, setPageCount] = React.useState<number>(0)

    const fetchData = React.useCallback(state => {
        const q = Transaction.query().leftJoin('actor', 'txn.actorId', 'actor.id')
            .select('txn.*', 'actor.Title as actorTitle')

        if (types.length > 0) {
            q.whereIn('type', types)
        }
        if (state.filters) {
            state.filters.forEach((f: Filter) => {
                // Insert `txn` table prefix for most columns
                filterQuery(q, f, f.id != 'actorTitle' ? 'txn' : undefined)
            })
        }

        q.clone().resultSize().then(total => {
            setPageCount(Math.ceil(total / state.pageSize))
        })

        sortQuery(q, state.sortBy)
        q.offset(state.pageSize * state.pageIndex).limit(state.pageSize).then(data => {
            setData(data)
        })
    }, [])

    return <Styles>
        <ReactTable {...{columns, data, fetchData, pageCount, initialState}} />
    </Styles>
}

export default function TransactionOverview() {
    return <div>
        <h1>Journal of transactions</h1>
        <Link to={`/transactions/new`}>New raw journal entry</Link>
        <TransactionTable types={[]} viewRaw={true} />
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

    th:nth-child(1) input {
        width: 3em;
    }
}
`
