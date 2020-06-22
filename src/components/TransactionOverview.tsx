import * as React from 'react'
import { Transaction, TransactionType, formatDateOnly } from '../core'
import styled from 'styled-components'
import { Column, ReactTable, filterQuery, Filter, sortQuery, SelectFilter, DateRangeFilter } from './ReactTable'
import { Link } from 'react-router-dom'

const TransactionTypeOptions = <>
    <option key='all' value=''>All</option>
    {Object.keys(Transaction.TypeInfo).map(key =>
        <option key={key} value={key}>{Transaction.TypeInfo[key].label}</option>)}
</>

const typePath: Record<string, string> = {
    '': 'transaction',
    [Transaction.Raw]: 'transaction',
    [Transaction.Invoice]: 'sale',
    [Transaction.Bill]: 'purchase',
}

function maybeLink(obj: Transaction, text: string) {
    let url: string | false = false
    const type = obj.type || ''
    if (text && obj instanceof Transaction && (!type || type.isEnum(TransactionType))) {
        if (type != Transaction.InvoicePayment && type != Transaction.BillPayment) {
            const path = typePath[type] ? typePath[type] : type
            url = `/${path}s/${obj.id}`
        }
    }

    return url ? <Link to={url}>{text}</Link> : text
}

function renderId(data: any) {
    return maybeLink(data.row.original, data.cell.value)
}

function renderDate(data: any) {
    return maybeLink(data.row.original, formatDateOnly(data.cell.value))
}

function renderDescription(data: any) {
    const t = data.row.original
    const part1 = maybeLink(t, data.cell.value)

    let part2
    if (t.type == Transaction.InvoicePayment || t.type == Transaction.BillPayment) {
        const settledType = t.type == Transaction.InvoicePayment ? 'invoice' : 'bill'
        part2 = <>
            (payment for <Link to={`/${settledType}s/${t.settleId}`}>{settledType} {t.settleId}</Link>)
        </>
    }
    else {
        part2 = null
    }

    return <>
        {part1}
        {part1 && part2 && <hr />}
        {part2}
    </>
}

function renderType(data: any) {
    const info = Transaction.TypeInfo[data.cell.value]
    return info ? info.label : data.cell.value
}

function renderActor(data: any) {
    if (data.cell.value) {
        const t = data.row.original
        return <Link to={`/${t.actorType}s/${t.actorId}`}>{data.cell.value}</Link>
    }
    return data.cell.value
}

function renderRaw(data: any) {
    return <Link to={`/transactions/${data.row.values.id}`}>view raw</Link>
}

type Props = {
    types: TransactionType[],
    viewRaw?: boolean,
    actorHeading?: string
}

function TransactionTable({types, viewRaw = false, actorHeading = 'Customer / Supplier'}: Props) {
    const columns = React.useMemo<Column<Transaction>[]>(() => {
        const columns: any = [
            { Header: 'Id', accessor: 'id', disableFilters: false, Cell: renderId },
            { Header: 'Date', accessor: 'date', disableFilters: false,
                Filter: DateRangeFilter, Cell: renderDate },
            { Header: 'Description', accessor: 'description', disableFilters: false, Cell: renderDescription },
            { Header: 'Type', accessor: 'type', disableFilters: types.length > 0, 
                Filter: SelectFilter, FilterOptions: TransactionTypeOptions, Cell: renderType },
            { Header: actorHeading, accessor: 'actorTitle', disableFilters: false, Cell: renderActor },
        ]
        if (viewRaw) {
            columns.push({ Header: 'View raw', id: 'raw-link', Cell: renderRaw })
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
            .select('txn.*', 'actor.type as actorType', 'actor.title as actorTitle')

        if (types.length > 0) {
            q.whereIn('txn.type', types)
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
        // Fetch any settlement elements
        q.withGraphFetched('elements').modifyGraph('elements', builder => {
            builder.whereNot('settleId', 0)
        })
        q.offset(state.pageSize * state.pageIndex).limit(state.pageSize).then(data => {
            // Hoist settleId from the first element, if any, to the parent transaction
            data.forEach(t => {
                (t as any).settleId = t.elements && t.elements[0] ? t.elements[0].settleId : 0
            })
            setData(data)
        })
    }, [])

    return <Styles>
        <ReactTable {...{columns, data, fetchData, pageCount, initialState}} />
    </Styles>
}

export function TransactionOverview() {
    return <div>
        <h1>Journal of transactions</h1>
        <TransactionTable
            types={[]}
            viewRaw={true}
        />
    </div>
}

export function SalesOverview() {
    return <div>
        <h1>List of sales</h1>
        <TransactionTable
            types={[Transaction.Sale, Transaction.Invoice]}
            actorHeading='Customer'
        />
    </div>
}

export function PurchasesOverview() {
    return <div>
        <h1>List of purchases</h1>
        <TransactionTable
            types={[Transaction.Purchase, Transaction.Bill]}
            actorHeading='Supplier'
        />
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
