import * as React from 'react'
import { useTable } from 'react-table'
import { Transaction, TransactionType } from '../core'
import styled from 'styled-components'
import { ReactTable, getRowId } from './ReactTable'
import { Link } from "react-router-dom"

function LinkToRawTransaction(data: any) {
    const url = `/transactions/${data.row.values.id}`
    return <Link to={url}>{url}</Link>
}

function LinkToTransaction(data: any) {
    const type = data.row.values.type
    if (type.isEnum(TransactionType)) {
        const url = `/${type}s/${data.cell.row.id}`
        return <Link to={url}>{data.cell.value}</Link>    
    }
    else {
        return data.cell.value
    }
}

export default function TransactionOverview() {
    const tableConfig: any = React.useMemo(() => {
        return {
            getRowId: getRowId,
            columns: [
                { Header: 'Id', accessor: 'id', Cell: LinkToTransaction },
                { Header: 'Date', accessor: 'date', Cell: LinkToTransaction},
                { Header: 'Description', accessor: 'description', Cell: LinkToTransaction},
                { Header: 'Type', accessor: 'type', Cell: LinkToTransaction},
                { Header: 'Raw link', id: 'raw-link', Cell: LinkToRawTransaction},
            ],
        }
    }, [])

    const [data, setData] = React.useState([] as object[])
    React.useEffect(() => {
        Transaction.query()
        .orderBy([{column: 'date', order: 'desc'}, {column: 'id', order: 'desc'}])
        .then((data: object[]) => {
            setData(data)
        })
    }, [])

    return <div>
        <h1>List of transactions</h1>
        <Styles>
            <ReactTable {...useTable({...tableConfig, data})} />
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
