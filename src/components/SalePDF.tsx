/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, B, Tr, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { CREDITS, Project, Element, Transaction, TransactionType, Actor,
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
    ownTaxIds: {
        label: string
        taxId: string
    }[]

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

    payments: {
        id: number
        amount: number
        currency: string
    }[]
    paidAmount: number
    dueAmount: number

    euReverseChargeSale?: boolean
    euCommunityGoods?: boolean
}

async function reportInfo(id: number) : Promise<ReportInfo> {
    const transaction = await Transaction.query().findById(id)
        .whereIn('type', [Transaction.Sale, Transaction.Invoice])
        .withGraphJoined('actor')
        .withGraphFetched('elements')
        .withGraphFetched('settledBy') as Transaction & { actor: Actor, settledBy: Element[] }

    if (!transaction) {
        return Promise.reject('Not found')
    }

    const brackets: Record<string, TaxItem[]> = {}
    const taxIds: Record<string, {label: string, taxId: string}> = {}
    const result: ReportInfo = {
        type: transaction.type!,
        id: transaction.id!,
        customerTitle: transaction.actor.title!,
        customerAddress: transaction.actor.address!,
        customerTaxIdLabel: transaction.actor.taxIdLabel!,
        customerTaxId: transaction.actor.taxId!,
        ownTitle: Project.variables.get('title'),
        ownAddress: Project.variables.get('address'),
        ownTaxIds: [],
        date: transaction.date!,
        due: transaction.due,
        currency: '',
        elements: [],
        subTotal: 0,
        taxes: [],
        total: 0,
        payments: [],
        paidAmount: 0,
        dueAmount: 0,
    }

    if (transaction.elements && transaction.elements.length > 0) {
        result.currency = transaction.elements[0].currency!

        const children = []
        for (let e of transaction.elements) {
            // Only populate credit elements
            if (e.drcr == Transaction.Credit) {
                if (e.currency != result.currency) {
                    return Promise.reject(`Must be single currency: ${e.currency}, ${result.currency}`)
                }

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

                if (!taxIds[info.authority]) {
                    taxIds[info.authority] = {
                        label: info.taxAuthority.taxIdLabel,
                        taxId: Project.variables.get(info.taxAuthority.taxIdVariableName),
                    }
                }

                let push = true
                // Some special processing for EU VAT
                if (info.isEU) {
                    if (info.variant == 'reverse') {
                        result.euReverseChargeSale = true
        
                        // Reverse charges are omitted (BUT they should also be zero)
                        if (item.amount == 0) {
                            push = false
                        }
                    }

                    if (info.tag == 'eu-goods') {
                        result.euCommunityGoods = true
                    }
                }

                if (push) {
                    const baseCode = info.baseCode
                    if (!brackets[baseCode]) {
                        brackets[baseCode] = []
                    }
                    brackets[baseCode].push(item)
                    parent.taxes.push(item)
                }
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

    result.subTotal = result.elements.length > 0 ? addSubtractMoney(result.elements)[0].amount : 0

    // Process taxIds
    Object.keys(taxIds).forEach(k => {
        if (taxIds[k].taxId) {
            result.ownTaxIds.push(taxIds[k])
        }
    })
    result.ownTaxIds.sort(orderByField('label'))
    
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

    if (transaction.settledBy && transaction.settledBy.length > 0) {
        for (let e of transaction.settledBy) {
            if (e.currency != result.currency) {
                return Promise.reject(`Must be single currency: ${e.currency}, ${result.currency}`)
            }

            result.payments.push({
                id: e.id!,
                amount: e.amount!,
                currency: e.currency!,
            })
        }
    }

    result.paidAmount = result.payments.length > 0 ? addSubtractMoney(result.payments)[0].amount : 0
    result.dueAmount = addSubtractMoney(
        [{amount: result.total, currency: result.currency}],
        [{amount: result.paidAmount, currency: result.currency}],
    )[0].amount

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

    if (info || error) {
        return <div>
            <div className='title-pane'>
                <span className='breadcrumb'><Link to='/sales'>
                    Sales
                </Link> » <Link to={`/sales/${argId}`}>
                    {info ? Transaction.TypeInfo[info.type].label : 'Sale'} {argId}
                </Link> » </span>
                <h1 className='title inline'>Print</h1>
            </div>

            {error && <div className='error'>{error}</div>}
            {info && report && <PDFView _key={nonce} filename={`invoice-${info.id}.pdf`}>{report}</PDFView>}
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

    const notes: string[] = []
    if (info.euReverseChargeSale) {
        notes.push('EU VAT reverse charged')
    }
    if (info.euCommunityGoods) {
        notes.push('Intra-Community supply of goods')
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
                <ThLeft width={30}>From:</ThLeft>
                <TdLeft width={70}>{info.ownTitle}</TdLeft>
            </Tr>{info.ownAddress && <Tr style={{marginBottom: 3}}>
                <ThLeft width={30}></ThLeft>
                <Td width={70}>{info.ownAddress}</Td>
            </Tr>}{info.ownTaxIds.map((a, index) => <Tr key={index} style={{marginBottom: 3}}>
                <ThLeft width={30}>{a.label}:</ThLeft>
                <TdLeft width={70}>{a.taxId}</TdLeft>
            </Tr>)}</View>
        </View>

        <Tr style={[rowStyle, {marginTop: 24, borderBottomWidth: 1}]}>
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

        <Tr style={{marginTop: 12, marginBottom: 3 + 12}}>
            <ThRight width={80}>Total</ThRight>
            <TdRight width={20}>{toFormatted(info.total, info.currency)}</TdRight>
        </Tr>

        {info.paidAmount > 0 && <Tr style={{marginBottom: 3}}>
            <TdRight width={80}>Previous payments</TdRight>
            <TdRight width={20}>{toFormatted(info.paidAmount, info.currency)}</TdRight>
        </Tr>}

        <Tr style={{marginBottom: 3}}>
            <ThRight width={80}>Amount Due</ThRight>
            <TdRight width={20}>{toFormatted(info.dueAmount, info.currency)}</TdRight>
        </Tr>

        {info.dueAmount == 0 && <Tr style={{marginBottom: 3}}>
            <ThRight width={100}>PAID</ThRight>
        </Tr>}

        {notes.length > 0 && <View style={{marginTop: 24, marginBottom: 3}}>
            <B>NOTES</B>
        </View>}
        {notes.map((line, index) => <View key={index} style={{marginBottom: 3}}>
            <T>{line}</T>
        </View>)}

        {!!CREDITS && <View style={{
            position: 'absolute',
            bottom: 56, left: 56, right: 56,
            borderStyle: 'solid', borderColor: '#333', borderTopWidth: 1,
            paddingTop: 1,
        }}>
            <T style={{fontSize: 8}}>{CREDITS}</T>
        </View>}
    </Page></Document>
}
