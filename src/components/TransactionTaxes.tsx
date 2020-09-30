/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Transaction, formatDateOnly, toFormatted, datePresetDates, TaxAuthority, taxAuthorities, TaxItemGroup, taxItems } from '../core'
import { CURRENCY_TOTALS_WRAP, DateRange, ReportHeader } from './Reports'
import { orderByField } from '../util/util'
import { datePresetSelectOptions } from './SelectOptions'

type Division = {
    authority: TaxAuthority
    id: string
    region: string
    outputs: TaxItemGroup
    inputs: TaxItemGroup
}

type TransactionTaxes = {
    startDate: string
    endDate: string
    accrual: boolean
    authorities: Division[]
}

export async function transactionTaxes(startDate: string, endDate: string, accrual = true) : Promise<TransactionTaxes> {
    const items = await taxItems(startDate, endDate, accrual)
    const result: TransactionTaxes = {
        startDate,
        endDate,
        accrual,
        authorities: []
    }
    const authorities: Record<string, Division> = {}

    items.forEach(item => {
        if (!authorities[item.taxInfo.authority]) {
            authorities[item.taxInfo.authority] = {
                authority: taxAuthorities[item.taxInfo.authority],
                id: item.taxInfo.authority,
                region: taxAuthorities[item.taxInfo.authority].regionName,
                outputs: { items: [], taxTotals: [], totals: [] },
                inputs: { items: [], taxTotals: [], totals: [] },
            }
        }

        if (item.drcr == Transaction.Credit) {
            authorities[item.taxInfo.authority].outputs.items.push(item)
        }
        else {
            authorities[item.taxInfo.authority].inputs.items.push(item)
        }
    })

    result.authorities = Object.keys(authorities).map(k => authorities[k])
    result.authorities.sort(orderByField('region'))

    result.authorities.forEach(division => {
        division.outputs.taxTotals = Transaction.getSums(division.outputs.items)
        division.inputs.taxTotals = Transaction.getSums(division.inputs.items)

        division.outputs.totals = Transaction.getSums(division.outputs.items.map(item => {
            return {...item, amount: item.parentAmount}
        }))
        division.inputs.totals = Transaction.getSums(division.inputs.items.map(item => {
            return {...item, amount: item.parentAmount}
        }))
    })

    return result
}

export function TransactionTaxesDetail() {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [cashBasis, setCashBasis] = React.useState<boolean>(false)
    const [info, setInfo] = React.useState<TransactionTaxes>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)

    function onPresetChange(e: any) {
        const value = e.target.value
        setPreset(value)

        if (value != 'custom') {
            const range = datePresetDates(value)
            setStartDate(range[0])
            setEndDate(range[1])
        }
    }

    function onDateChange(startDate: string, endDate: string) {
        setStartDate(startDate)
        setEndDate(endDate)
    }

    function onCashBasisChange(e: any) {
        setCashBasis(e.target.checked)
    }

    React.useEffect(() => {
        if (startDate && endDate) {
            transactionTaxes(startDate, endDate, !cashBasis).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, cashBasis])

    const report = React.useMemo(() => {
        return info ? <Document><Page size="A4" style={[Styles.page, {fontSize: 8}]}>
            <View fixed={true}>
                <ReportHeader startDate={info.startDate} endDate={info.endDate} title='Transaction Tax: Detail'>
                    <T style={{fontSize: 10}}>({info.accrual ? 'Accrual' : 'Cash'} accounting basis)</T>
                </ReportHeader>
                <Tr key='header' style={{marginBottom: 6}}>
                    <ThLeft width={14} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                    <ThLeft width={10} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                    <ThLeft width={14} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                    <ThLeft width={22} innerStyle={{borderBottomWidth: 1}}>Description</ThLeft>
                    <Th width={8} innerStyle={{borderBottomWidth: 1}}>Tax Code</Th>
                    <ThRight width={7} innerStyle={{borderBottomWidth: 1}}>Rate</ThRight>
                    <ThRight width={10} innerStyle={{borderBottomWidth: 1}}>Tax</ThRight>
                    <ThRight width={15} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
                </Tr>
            </View>

            {info.authorities.map(division => <React.Fragment key={division.authority.id}>
                <Tr><Th width={100}>{division.authority.regionName}</Th></Tr>
                {division.outputs.items.length > 0 && <>
                    <Tr><Th width={98} indent={2}>Tax Payable</Th></Tr>
                    <GroupItems group={division.outputs} />
                    <GroupTotal group={division.outputs} />
                </>}
                {division.inputs.items.length > 0 && <>
                    <Tr><Th width={98} indent={2}>Tax Receivable</Th></Tr>
                    <GroupItems group={division.inputs} />
                    <GroupTotal group={division.inputs} />
                </>}
            </React.Fragment>)}
        </Page></Document> : null
    }, [info && nonce ? nonce : 0])

    return <div>
        <h1><span className='title'>Transaction Tax: Detail</span></h1>
        <table className='horizontal-table-form'><tbody><tr className='row row-date-preset'>
            <th scope='row'>
                <label htmlFor='preset'>Date:</label>
            </th><td>
                <select name='preset' value={preset} onChange={onPresetChange}>
                    {!preset && <option key='' value=''></option>}
                    {datePresetSelectOptions()}
                </select>
                {preset == 'custom' && <DateRange onChange={onDateChange} startDate={startDate} endDate={endDate} />}
            </td>
        </tr><tr className='row row-cash-basis'>
            <th scope='row'>
                <label htmlFor='cashBasis'>Cash accounting basis:</label>
            </th><td>
                <input type='checkbox' name='cashBasis' checked={cashBasis} onChange={onCashBasisChange} />
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='transaction-tax-detail.pdf'>{report}</PDFView>}
    </div>
}

export function GroupItems({group, gross, indent = 4}: {group: TaxItemGroup, gross?: boolean, indent?: number}) {
    return group.items.map((item, index) => <Tr key={item.id}>
        <TdLeft width={14 - indent} indent={indent}>{Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}</TdLeft>
        <Td width={10} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
        <TdLeft width={14} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
        <TdLeft width={22} innerStyle={{maxLines: 2}}>{
                !item.txnDescription ? item.parentDescription :
                !item.parentDescription ? item.txnDescription :
                `${item.txnDescription}: ${item.parentDescription}`
        }</TdLeft>
        <Td width={8} innerStyle={{maxLines: 2}}>{item.taxInfo.reportLabel}</Td>
        <TdRight width={7}>{item.taxInfo.rate}%</TdRight>
        <TdRight width={10} innerStyle={index == group.items.length - 1 ? {
            marginBottom: 3,
            paddingBottom: 3,
            borderBottomWidth: 1,
        } : {}}>{toFormatted(item.amount, item.currency)}</TdRight>
        <TdRight width={15} innerStyle={index == group.items.length - 1 ? {
            marginBottom: 3,
            paddingBottom: 3,
            borderBottomWidth: 1,
        } : {}}>{toFormatted(gross ? item.grossAmount : item.parentAmount, item.currency)} {item.currency}</TdRight>
    </Tr>) as any
}

export function GroupTotal({label, group, indent = 2, marginBottom = 12}: {label?: string, group: TaxItemGroup, indent?: number, marginBottom?: number}) {
    return <View wrap={group.totals.length > CURRENCY_TOTALS_WRAP}>
    {group.totals.map((money, index) => {
        const taxMoney = group.taxTotals[index]
        return <Tr key={money.currency} style={index == group.totals.length-1 ? {
            marginBottom,
        } : {}}>
            <ThLeft width={75 - indent} indent={indent}>{index == 0 && label ? label : ''}</ThLeft>
            <ThRight width={10}>{toFormatted(taxMoney.amount, taxMoney.currency)}</ThRight>
            <ThRight width={15}>
                {toFormatted(money.amount, money.currency)} {money.currency}
            </ThRight>
        </Tr>
    })}
    </View>
}
