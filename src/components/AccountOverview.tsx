import * as React from 'react'
import { useTable } from 'react-table'
import { Account } from '../core'
import styled from 'styled-components'
import { ReactTable, getRowId } from './ReactTable'
import { Link } from "react-router-dom"

function LinkToAccount({cell}: any) {
    return <Link to={`/account/${cell.row.id}`}>{cell.value}</Link>
}

export default function AccountOverview() {
    const tableConfig: any = React.useMemo(() => {
        return {
            getRowId: getRowId,
            columns: [
                { Header: 'ID', accessor: 'id', Cell: LinkToAccount },
                { Header: 'Title', accessor: 'title', Cell: LinkToAccount },
                { Header: 'Type', accessor: 'type'},
            ],
        }
    }, [])

    const [data, setData] = React.useState([] as object[])
    React.useEffect(() => {
        Account.query().then((data: object[]) => {
            setData(data)
        })
    }, [])

    return <div>
        <h1>List of accounts</h1>
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
