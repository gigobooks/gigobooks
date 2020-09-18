/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Transaction, formatDateOnly, toFormatted,
    TransactionTaxes, transactionTaxesDetail, datePresetDates } from '../core'
import { CURRENCY_TOTALS_WRAP, DateRange, ReportHeader } from './Reports'

export function TransactionTaxesDetail() {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [cashBasis, setCashBasis] = React.useState<boolean>(false)
    const [info, setInfo] = React.useState<TransactionTaxes>()

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
            transactionTaxesDetail(startDate, endDate, !cashBasis).then(data => {
                setInfo(data)
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
                    <ThLeft width={15} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                    <ThLeft width={24} innerStyle={{borderBottomWidth: 1}}>Description</ThLeft>
                    <Th width={8} innerStyle={{borderBottomWidth: 1}}>Tax Code</Th>
                    <ThRight width={7} innerStyle={{borderBottomWidth: 1}}>Rate</ThRight>
                    <ThRight width={8} innerStyle={{borderBottomWidth: 1}}>Tax</ThRight>
                    <ThRight width={14} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
                </Tr>
            </View>

            {info.authorities.map(division => <React.Fragment key={division.authority.id}>
                <Tr><Th width={100}>{division.authority.regionName}</Th></Tr>
                {division.outputs.items.length > 0 && <Group label='Tax Payable' group={division.outputs} />}
                {division.outputs.items.length > 0 && <GroupTotal label='Total Tax Payable' group={division.outputs} />}
                {division.inputs.items.length > 0 && <Group label='Tax Receivable' group={division.inputs} />}
                {division.inputs.items.length > 0 && <GroupTotal label='Total Tax Receivable' group={division.inputs} />}
            </React.Fragment>)}
        </Page></Document> : null
    }, [info])

    return <div>
        <h1><span className='title'>Transaction Tax: Detail</span></h1>
        <table className='horizontal-table-form'><tbody><tr className='row row-date-preset'>
            <th scope='row'>
                <label htmlFor='preset'>Date:</label>
            </th><td>
                <select name='preset' value={preset} onChange={onPresetChange}>
                    {!preset && <option key='' value=''></option>}
                    <option key='this-month' value='this-month'>This month</option>
                    <option key='this-quarter' value='this-quarter'>This quarter</option>
                    <option key='this-year' value='this-year'>This financial year</option>
                    <option key='prev-month' value='prev-month'>Last month</option>
                    <option key='prev-quarter' value='prev-quarter'>Last quarter</option>
                    <option key='prev-year' value='prev-year'>Last financial year</option>
                    <option key='custom' value='custom'>Custom date range</option>
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

        {report && <PDFView filename='transaction-tax-detail.pdf'>{report}</PDFView>}
    </div>
}

function Group({label, group}: {label: string | false, group: TransactionTaxes['authorities'][0]['inputs']}) {
    return <>
        <Tr key={label}>
            <Th width={98} indent={2}>{label}</Th>
        </Tr>

        {group.items.map((item, index) => {
            return <Tr key={item.id}>
                <TdLeft width={10} indent={4}>{Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}</TdLeft>
                <Td width={10} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                <TdLeft width={15} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
                <TdLeft width={24} innerStyle={{maxLines: 2}}>{
                        !item.txnDescription ? item.parentDescription :
                        !item.parentDescription ? item.txnDescription :
                        `${item.txnDescription}: ${item.parentDescription}`
                }</TdLeft>
                <Td width={8} innerStyle={{maxLines: 2}}>{item.taxInfo.reportLabel}</Td>
                <TdRight width={7}>{item.taxInfo.rate}%</TdRight>
                <TdRight width={8} innerStyle={index == group.items.length - 1 ? {
                    marginBottom: 3,
                    paddingBottom: 3,
                    borderBottomWidth: 1,
                } : {}}>{toFormatted(item.amount, item.currency)}</TdRight>
                <TdRight width={14} innerStyle={index == group.items.length - 1 ? {
                    marginBottom: 3,
                    paddingBottom: 3,
                    borderBottomWidth: 1,
                } : {}}>{toFormatted(item.parentAmount, item.currency)} {item.currency}</TdRight>
            </Tr>
        })}
    </>
}

function GroupTotal({label, group}: {label: string | false, group: TransactionTaxes['authorities'][0]['inputs']}) {
    return <View wrap={group.totals.length > CURRENCY_TOTALS_WRAP}>
    {group.totals.map((money, index) => {
        const taxMoney = group.taxTotals[index]
        return <Tr key={money.currency} style={index == group.totals.length-1 ? {
            marginBottom: 12,
        } : {}}>
            <ThLeft width={76} indent={2}>{index == 0 ? label : ''}</ThLeft>
            <ThRight width={8}>{toFormatted(taxMoney.amount, taxMoney.currency)}</ThRight>
            <ThRight width={14}>
                {toFormatted(money.amount, money.currency)} {money.currency}
            </ThRight>
        </Tr>
    })}
    </View>
}
