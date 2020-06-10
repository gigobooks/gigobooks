import * as React from 'react'
import { Account } from '../core'
import styled from 'styled-components'
import { Column, ReactTable } from './ReactTable'
import { Link } from 'react-router-dom'

type Props = {
    path: string
}

export default function AccountOverview(props: Props) {
    function LinkToItem(data: any) {
        return <Link to={`${props.path}/${data.cell.row.id}`}>{data.cell.value}</Link>
    }

    const columns = React.useMemo<Column<Account>[]>(() => [
        { Header: 'ID', accessor: 'id', Cell: LinkToItem },
        { Header: 'Title', accessor: 'title', Cell: LinkToItem },
        { Header: 'Type', accessor: 'type'},
    ], [])
    const [data, setData] = React.useState<Account[]>([])
    const [pageCount, setPageCount] = React.useState<number>(0)

    const fetchData = React.useCallback(({pageSize, pageIndex}) => {
        Account.query().resultSize().then((total) => {
            setPageCount(Math.ceil(total / pageSize))
        })
        Account.query().offset(pageSize * pageIndex).limit(pageSize).then((data) => {
            setData(data)
        })
    }, [])

    return <div>
        <h1>List of accounts</h1>
        <Link to={`${props.path}/new`}>New account</Link>
        <Styles>
            <ReactTable {...{columns, data, fetchData, pageCount}} />
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
