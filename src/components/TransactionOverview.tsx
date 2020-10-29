/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Transaction, TransactionType, formatDateOnly, toFormatted, TaxCodeInfo } from '../core'
import { Column, ReactTable, filterQuery, Filter, sortQuery, SelectFilter, DateRangeFilter } from './ReactTable'
import { QueryBuilder } from 'objection'
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
    let text = data.cell.value

    // If description is empty, use the first element description which exists
    if (!text) {
        for (let e of t.elements) {
            if (e.description) {
                text = e.description
                break
            }
        }
    }
    const part1 = maybeLink(t, text)

    let part2
    if (t.type == Transaction.InvoicePayment || t.type == Transaction.BillPayment) {
        const settledType = t.type == Transaction.InvoicePayment ? 'invoice' : 'bill'
        const urlPart = t.type == Transaction.InvoicePayment ? 'sale' : 'purchase'
        part2 = <>
            (payment for <Link to={`/${urlPart}s/${t.settleId}`}>{settledType} {t.settleId}</Link>)
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

function renderTotal(data: any) {
    const t: Transaction = data.row.original
    const sums = Transaction.getSums(t.elements!.filter(e => {
        // Reverse charges aren't included in the total
        if (e.taxCode && new TaxCodeInfo(e.taxCode).reverse) {
            return false
        }
        return e.drcr == Transaction.Debit
    }))

    return <>
        {sums.map(money =>
        <div key={money.currency}>
            {money.currency} {toFormatted(money.amount, money.currency)}
        </div>
        )}
    </>
}

function renderRaw(data: any) {
    return <Link to={`/transactions/${data.row.values.id}`}>view raw</Link>
}

type Props = {
    types: TransactionType[],
    typesFilter?: {
        filter?: any,
        options?: any,
        process?: (q: QueryBuilder<any>, f:Filter) => void,
    },
    viewRaw?: boolean,
    actorHeading?: string
}

function TransactionTable({types, typesFilter, viewRaw = false, actorHeading = 'Customer / Supplier'}: Props) {
    const columns = React.useMemo<Column<Transaction>[]>(() => {
        const columns: any = [
            { Header: 'Id', accessor: 'id', disableFilters: false, Cell: renderId },
            { Header: 'Date', accessor: 'date', disableFilters: false,
                Filter: DateRangeFilter, Cell: renderDate },
            { Header: 'Description', accessor: 'description', disableFilters: false, Cell: renderDescription },
            { Header: 'Type', accessor: 'type', disableFilters: !typesFilter,
                Filter: typesFilter && typesFilter.filter, FilterOptions: typesFilter && typesFilter.options, Cell: renderType },
            { Header: actorHeading, accessor: 'actorTitle', disableFilters: false, Cell: renderActor },
            { Header: 'Amount', id: 'total', Cell: renderTotal },
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
                if (f.id == 'type' && typesFilter && typesFilter.process) {
                    typesFilter.process(q, f)
                }
                else {
                    // Insert `txn` table prefix for most columns
                    filterQuery(q, f, f.id != 'actorTitle' ? 'txn' : undefined)
                }
            })
        }

        q.clone().resultSize().then(total => {
            setPageCount(Math.ceil(total / state.pageSize))
        })

        sortQuery(q, state.sortBy)
        q.withGraphFetched('elements')
        q.orderBy('id', 'desc')     // Least significant sort order
        q.offset(state.pageSize * state.pageIndex).limit(state.pageSize).then(data => {
            data.forEach(t => {
                // Hoist settleId from any elements, if any, to the parent transaction
                for (let e of t.elements!) {
                    if (e.settleId) {
                        (t as any).settleId = e.settleId
                        break
                    }
                }
            })
            setData(data)
        })
    }, [])

    return <ReactTable className='data-table' {...{columns, data, fetchData, pageCount, initialState}} />
}

export function TransactionOverview() {
    return <div>
        <h1 className='title'>Journal of transactions</h1>
        <TransactionTable
            types={[]}
            viewRaw={true}
            typesFilter={{
                filter: SelectFilter,
                options: TransactionTypeOptions,
            }}
        />
    </div>
}

function PaymentsFilter(table: {column: {filterValue: string, setFilter: any}}) {
    return <label>
        <input type='checkbox'
            onChange={e => {
                table.column.setFilter(e.target.checked ? (table.column as any).FilterOptions : undefined) // Set undefined to remove the filter entirely
            }}
        />
        payments
    </label>
}

function paymentsFilterProcess(q: QueryBuilder<any>, f:Filter) {
    q.orWhereIn('txn.type', Array.isArray(f.value) ? f.value : [f.value])
}

export function SalesOverview() {
    return <div>
        <h1 className='title'>List of sales</h1>
        <TransactionTable
            types={[Transaction.Sale, Transaction.Invoice]}
            actorHeading='Customer'
            typesFilter={{
                filter: PaymentsFilter,
                options: [Transaction.InvoicePayment],
                process: paymentsFilterProcess,
            }}
        />
    </div>
}

export function PurchasesOverview() {
    return <div>
        <h1 className='title'>List of purchases</h1>
        <TransactionTable
            types={[Transaction.Purchase, Transaction.Bill]}
            actorHeading='Supplier'
            typesFilter={{
                filter: PaymentsFilter,
                options: [Transaction.BillPayment],
                process: paymentsFilterProcess,
            }}
        />
    </div>
}
