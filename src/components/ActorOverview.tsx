import * as React from 'react'
import { useTable } from 'react-table'
import { Actor } from '../core'
import styled from 'styled-components'
import { ReactTable, getRowId } from './ReactTable'
import { Link } from 'react-router-dom'

type Props = {
    path: string
}

function LinkToItem(data: any) {
    return <Link to={`/${data.row.values.type}s/${data.cell.row.id}`}>{data.cell.value}</Link>
}

export default function ActorOverview(props: Props) {
    const tableConfig: any = React.useMemo(() => {
        return {
            getRowId: getRowId,
            columns: [
                { Header: 'ID', accessor: 'id', Cell: LinkToItem },
                { Header: 'Title', accessor: 'title', Cell: LinkToItem },
                { Header: 'Type', accessor: 'type' },
                { Header: 'Tax id', accessor: 'taxId', Cell: LinkToItem },
            ],
        }
    }, [])

    const [items, setItems] = React.useState([] as object[])
    React.useEffect(() => {
        Actor.query().orderBy(['title', 'id']).then((rows) => {
            setItems(rows)
        })
    }, [])

    return <div>
        <h1>List of customers and suppliers</h1>
        <Link to={`customers/new`}>New customer</Link> - <Link to={`suppliers/new`}>New supplier</Link>
        <Styles>
            <ReactTable {...useTable({...tableConfig, data: items})} />
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
