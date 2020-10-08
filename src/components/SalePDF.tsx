/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, B, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Project, Transaction, TransactionType, Actor,
    toFormatted, TaxCodeInfo, formatDateOnly, addSubtractMoney } from '../core'
import { orderByField } from '../util/util'

type TaxItem = {
    id: number
    label: string
    rate: string
    amount: number
    currency: string
}

type ReportInfo = {
    type: TransactionType
    id: number

    customerTitle: string
    customerAddress: string
    customerTaxIdLabel: string
    customerTaxId: string

    ownTitle: string
    ownAddress: string
    // ownTaxIds: [] ??

    date: string
    due?: string
    currency: string
    elements: {
        id: number
        description: string
        amount: number
        currency: string
        taxes: TaxItem[]
    }[]

    subTotal: number

    taxes: {
        // info: TaxCodeInfo,
        label: string
        items: TaxItem[]
        total: number
    }[]

    total: number

    /*
    // payment: number
    // dueAmount: number
    */

    // 'eu reverse charge'? (near buyer vat number?)
    // intra-community-supply of goods?
}

async function reportInfo(id: number) : Promise<ReportInfo> {
    const transaction = await Transaction.query().findById(id)
        .whereIn('type', [Transaction.Sale, Transaction.Invoice])
        .withGraphJoined('actor')
        .withGraphFetched('elements') as Transaction & { actor: Actor }

    if (!transaction) {
        return Promise.reject('Not found')
    }

    const brackets: Record<string, TaxItem[]> = {}
    const result: ReportInfo = {
        type: transaction.type!,
        id: transaction.id!,
        customerTitle: transaction.actor.title!,
        customerAddress: transaction.actor.address!,
        customerTaxIdLabel: transaction.actor.taxIdLabel!,
        customerTaxId: transaction.actor.taxId!,
        ownTitle: Project.variables.get('title'),
        ownAddress: Project.variables.get('address'),
        // ownTaxIds ??
        date: transaction.date!,
        due: transaction.due,
        currency: '',
        elements: [],
        subTotal: 0,
        taxes: [],
        total: 0,
    }

    if (transaction.elements && transaction.elements.length > 0) {
        result.currency = transaction.elements[0].currency!

        const children = []
        for (let e of transaction.elements) {
            if (e.drcr == Transaction.Credit) {
                // Only populate credit elements
                if (e.parentId == 0) {
                    result.elements.push({
                        id: e.id!,
                        amount: e.amount!,
                        currency: e.currency!,
                        description: e.description!,
                        taxes: [],
                    })
                }
                else {
                    children.push(e)
                }
            }
        }
        
        // Now populate child elements. Any orphans are promoted.
        for (let e of children) {
            let parent: typeof result.elements[0] | false = false
            for (let p of result.elements) {
                if (e.parentId == p.id) {
                    parent = p
                    break
                }
            }

            if (parent) {
                const info = new TaxCodeInfo(e.taxCode!)
                const item = {
                    id: e.id!,
                    label: info.typeAndRateLabel,
                    rate: info.rate,
                    amount: e.amount!,
                    currency: e.currency!,
                }

                parent.taxes.push(item)

                const baseCode = info.baseCode
                if (!brackets[baseCode]) {
                    brackets[baseCode] = []
                }
                brackets[baseCode].push(item)
            }
            else {
                result.elements.push({
                    id: e.id!,
                    amount: e.amount!,
                    currency: e.currency!,
                    description: e.description!,
                    taxes: [],
                })
            }
        }
    }

    result.subTotal = addSubtractMoney(result.elements)[0].amount

    // Process taxes
    Object.keys(brackets).forEach(baseCode => {
        result.taxes.push({
            label: new TaxCodeInfo(baseCode).typeAndRateLabel,
            items: brackets[baseCode],
            total: addSubtractMoney(brackets[baseCode])[0].amount,
        })
    })
    result.taxes.sort(orderByField('label'))

    result.total = addSubtractMoney([
        {amount: result.subTotal, currency: result.currency},
        ...result.taxes.map(b => ({amount: b.total, currency: result.currency}))
    ])[0].amount

    return result
}

type Props = {
    arg1?: string
}

export default function SalePrint(props: Props) {
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0
    const [info, setInfo] = React.useState<ReportInfo>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)

    React.useEffect(() => {
        let mounted = true

        if (argId > 0) {
            reportInfo(argId).then(info => {
                if (mounted) {
                    setInfo(info)
                    setError('')
                    setNonce(Date.now())
                }
            }).catch(e => {
                setError(e.toString())
            })
        }

        return () => {mounted=false}
    }, [props.arg1])

    const report = React.useMemo(() => {
        return info ? renderReport(info) : null
    }, [info && nonce ? nonce : 0])

    if (info) {
        return <div>
            <div className='title-pane'>
                <span className='breadcrumb'><Link to='/sales'>
                    Sales
                </Link> » <Link to={`/sales/${info.id}`}>
                    {Transaction.TypeInfo[info.type].label} {info.id}
                </Link> » </span>
                <h1 className='title inline'>Print</h1>
            </div>

            {error && <div className='error'>{error}</div>}
            {report && <PDFView _key={nonce} filename={`invoice-${info.id}.pdf`}>{report}</PDFView>}
        </div>
    }

    return null
}

function renderReport(info: ReportInfo) {
    const rowStyle={
        paddingTop: 3,
        paddingBottom: 3,
        borderStyle: 'solid',
        borderColor: '#e0e0e0',
    }

    return <Document><Page size="A4" style={[Styles.page, {fontSize: 10}]}>
        <View style={{fontSize: 24, marginBottom: 12}}>
            <B>TAX INVOICE</B>
        </View>

        <View style={{flexDirection: 'row'}}>
            <View style={{width: '50%'}}><Tr style={{marginBottom: 3}}>
                <ThLeft width={30}>To:</ThLeft>
                <TdLeft width={70}>{info.customerTitle}</TdLeft>
            </Tr>{info.customerAddress && <Tr style={{marginBottom: 3}}>
                <ThLeft width={30}></ThLeft>
                <Td width={70}>{info.customerAddress}</Td>
            </Tr>}{info.customerTaxId && <Tr style={{marginBottom: 3}}>
                <ThLeft width={30}>{info.customerTaxIdLabel}:</ThLeft>
                <Td width={70}>{info.customerTaxId}</Td>
            </Tr>}<Tr style={{marginBottom: 3}}>
                <Td width={100}>&nbsp;</Td>
            </Tr><Tr style={{marginBottom: 3}}>
                <ThLeft width={30}>Invoice No.:</ThLeft>
                <Td width={70}>{info.id}</Td>
            </Tr><Tr style={{marginBottom: 3}}>
                <ThLeft width={30}>Issue Date:</ThLeft>
                <Td width={70}>{formatDateOnly(info.date)}</Td>
            </Tr>{info.due && <Tr style={{marginBottom: 3}}>
                <ThLeft width={30}>Due Date:</ThLeft>
                <Td width={70}>{formatDateOnly(info.due)}</Td>
            </Tr>}</View>

            <View style={{width: '35%', marginLeft: '15%'}}><Tr style={{marginBottom: 3}}>
                <ThLeft width={20}>From:</ThLeft>
                <TdLeft width={80}>{info.ownTitle}</TdLeft>
            </Tr>{info.ownAddress && <Tr style={{marginBottom: 3}}>
                <ThLeft width={20}></ThLeft>
                <Td width={80}>{info.ownAddress}</Td>
            </Tr>}</View>
        </View>

        <Tr style={[rowStyle, {marginTop: 36, borderBottomWidth: 1}]}>
            <ThLeft width={65}>Description</ThLeft>
            <ThRight width={15}>Tax</ThRight>
            <ThRight width={20}>Amount ({info.currency})</ThRight>
        </Tr>
        {info.elements.map(e => <React.Fragment key={e.id}>
            <Tr key={e.id} style={[rowStyle, {borderBottomWidth: 1}]}>
                <TdLeft width={65}>{e.description}</TdLeft>
                <TdRight width={15}>&nbsp;</TdRight>
                <TdRight width={20}>{toFormatted(e.amount, info.currency)}</TdRight>
            </Tr>
            {e.taxes.map(t => <Tr key={t.id} style={[rowStyle, {borderBottomWidth: 1}]}>
                <TdLeft width={60} indent={5}>{t.label}</TdLeft>
                <TdRight width={15}>{toFormatted(t.amount, info.currency)}</TdRight>
                <TdRight width={20}>&nbsp;</TdRight>
            </Tr>)}
        </React.Fragment>)}

        <Tr style={{marginTop: 24, marginBottom: 3}}>
            <ThRight width={80}>Subtotal</ThRight>
            <TdRight width={20}>{toFormatted(info.subTotal, info.currency)}</TdRight>
        </Tr>

        {info.taxes.map(b => <React.Fragment key={b.label}>
            <Tr style={{marginBottom: 3}}>
                <TdRight width={80}>{b.label}</TdRight>
                <TdRight width={20}>{toFormatted(b.total, info.currency)}</TdRight>
            </Tr>
        </React.Fragment>)}

        <Tr style={{marginTop: 12, marginBottom: 3}}>
            <ThRight width={80}>Total</ThRight>
            <TdRight width={20}>{toFormatted(info.total, info.currency)}</TdRight>
        </Tr>

    </Page></Document>
}
