/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View, PDFView, Styles, T, Tr, Th, ThLeft, ThRight } from './PDFView'
import { Project, Transaction, toFormatted,
    datePresetDates, convertCurrency, exchangeRates, TaxItemGroup, taxItems } from '../core'
import { DateRange, ReportHeader, ExchangeRates } from './Reports'
import { TaxReport } from './TaxReports'
import { GroupItems, GroupTotal } from './TransactionTaxes'
import { datePresetSelectOptions } from './SelectOptions'

type ReportInfo = {
    startDate: string
    endDate: string
    cash: boolean
    sales: TaxItemGroup
    intraEuGoodsSales: TaxItemGroup
    intraEuServicesSales: TaxItemGroup
    purchases: TaxItemGroup
    intraEuGoodsPurchases: TaxItemGroup
    intraEuServicesPurchases: TaxItemGroup
    lines: Record<string, number>
    exchangeRates: {}
}

async function reportInfo(startDate: string, endDate: string, cash: boolean) : Promise<ReportInfo> {
    const items = await taxItems(startDate, endDate, !cash, ['IE:'])
    const result: ReportInfo = { startDate, endDate, cash,
        sales: {items: [], taxTotals: [], totals: []},
        intraEuGoodsSales: {items: [], taxTotals: [], totals: []},
        intraEuServicesSales: {items: [], taxTotals: [], totals: []},
        purchases: {items: [], taxTotals: [], totals: []},
        intraEuGoodsPurchases: {items: [], taxTotals: [], totals: []},
        intraEuServicesPurchases: {items: [], taxTotals: [], totals: []},
        lines: {},
        exchangeRates: exchangeRates(),
    }

    items.forEach(item => {
        convertCurrency(item, 'EUR')
        if (item.drcr == Transaction.Credit) {
            result.sales.items.push(item)

            if (item.taxInfo.tag == 'eu-goods') {
                result.intraEuGoodsSales.items.push(item)
            }
            else if (item.taxInfo.tag == 'eu-service') {
                result.intraEuServicesSales.items.push(item)
            }
        }
        else {
            result.purchases.items.push(item)

            if (item.taxInfo.tag == 'eu-goods') {
                result.intraEuGoodsPurchases.items.push(item)
            }
            else if (item.taxInfo.tag == 'eu-service') {
                result.intraEuServicesPurchases.items.push(item)
            }
        }
    })

    ;['sales', 'intraEuGoodsSales', 'intraEuServicesSales',
      'purchases', 'intraEuGoodsPurchases', 'intraEuServicesPurchases'].forEach(field => {
        const group: TaxItemGroup = (result as any)[field]
        if (group.items.length > 0) {
            group.taxTotals = Transaction.getSums(group.items)
            group.totals = Transaction.getSums(group.items.map(item => {
                return {...item, amount: item.parentAmount}
            }))
        }
        else {
            group.taxTotals = [{amount: 0, currency: 'EUR'}]
            group.totals = [{amount: 0, currency: 'EUR'}]
        }
    })

    result.lines['t1'] = result.sales.taxTotals[0].amount
    result.lines['t2'] = result.purchases.taxTotals[0].amount

    if (result.lines['t1'] >= result.lines['t2']) {
        result.lines['t3'] = result.lines['t1'] - result.lines['t2']
        result.lines['t4'] = 0
    }
    else {
        result.lines['t3'] = 0
        result.lines['t4'] = result.lines['t2'] - result.lines['t1']
    }

    result.lines['e1'] = result.intraEuGoodsSales.totals[0].amount
    result.lines['e2'] = result.intraEuGoodsPurchases.totals[0].amount
    result.lines['es1'] = result.intraEuServicesSales.totals[0].amount
    result.lines['es2'] = result.intraEuServicesPurchases.totals[0].amount
    return result
}

export default function TaxReport() {
    const [summary, setSummary] = React.useState<boolean>(true)
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [info, setInfo] = React.useState<ReportInfo>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)
    const cash: boolean = Project.variables.get('ie:cash')

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

    React.useEffect(() => {
        if (startDate && endDate) {
            reportInfo(startDate, endDate, cash).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, cash])

    const report = React.useMemo(() => {
        return info ? renderReport(info, summary) : null
    }, [info && nonce ? nonce : 0, summary])

    return <div>
        <h1 className='title'>VAT3 Return</h1>
        <table className='horizontal-table-form'><tbody><tr className='row row-summary'>
            <th scope='row'>
                <label htmlFor='summary'>Summary:</label>
            </th><td>
                <input type='checkbox' name='summary' checked={summary} onChange={e => {setSummary((e.target.checked))}} />
            </td>
        </tr><tr className='row row-date-preset'>
            <th scope='row'>
                <label htmlFor='preset'>Date:</label>
            </th><td>
                <select name='preset' value={preset} onChange={onPresetChange}>
                    {!preset && <option key='' value=''></option>}
                    {datePresetSelectOptions()}
                </select>
                {preset == 'custom' && <DateRange onChange={onDateChange} startDate={startDate} endDate={endDate} />}
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='vat3-return.pdf'>{report}</PDFView>}
    </div>
}

function renderReport(info: ReportInfo, summary: boolean) {
    return <Document><Page size="A4" style={[Styles.page, {fontSize: summary ? 9 : 8}]}>
        <View fixed={true}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title={`VAT3 Return${summary ? '' : ': Detail'}`}>
                <T style={{fontSize: 10}}>({info.cash ? 'cash receipts basis of accounting' : 'accrual'})</T>
            </ReportHeader>
            {!summary && <Tr key='header' style={{marginBottom: 6}}>
                <ThLeft width={14} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                <ThLeft width={10} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                <ThLeft width={14} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                <ThLeft width={22} innerStyle={{borderBottomWidth: 1}}>Description</ThLeft>
                <Th width={8} innerStyle={{borderBottomWidth: 1}}>Tax Code</Th>
                <ThRight width={7} innerStyle={{borderBottomWidth: 1}}>Rate</ThRight>
                <ThRight width={10} innerStyle={{borderBottomWidth: 1}}>Tax</ThRight>
                <ThRight width={15} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
            </Tr>}
        </View>

        {summary ? <>
            <LineItemSummary label='T1 - VAT on sales' amount={info.lines['t1']} />
            <LineItemSummary label='T2 - VAT on purchases' amount={info.lines['t2']} />
            <LineItemSummary label='T3 - VAT payable' amount={info.lines['t3']} />
            <LineItemSummary label='T4 - VAT repayable' amount={info.lines['t4']} />

            <LineItemSummary label='E1 - Intra-EU supplies of goods' amount={info.lines['e1']} />
            <LineItemSummary label='E2 - Intra-EU acquisitions of goods' amount={info.lines['e2']} />
            <LineItemSummary label='ES1 - Intra-EU supply of service' amount={info.lines['es1']} />
            <LineItemSummary label='ES2 - Intra-EU acquisition of services' amount={info.lines['es2']} />
        </> : <>
            {info.sales.items.length > 0 && <>
                <Tr><Th width={100}>Sales</Th></Tr>
                <GroupItems group={info.sales} />
                <GroupTotal group={info.sales} />
            </>}
            <LineItem label='T1 - VAT on sales' amount={info.lines['t1']} />

            {info.purchases.items.length > 0 && <>
                <Tr><Th width={100}>Purchases</Th></Tr>
                <GroupItems group={info.purchases} />
                <GroupTotal group={info.purchases} />
            </>}
            <LineItem label='T2 - VAT on purchases' amount={info.lines['t2']} />

            <LineItem label='T3 - VAT payable' amount={info.lines['t3']} />
            <LineItem label='T4 - VAT repayable' amount={info.lines['t4']} />

            {info.intraEuGoodsSales.items.length > 0 && <>
                <Tr><Th width={100}>Intra-EU supplies of goods</Th></Tr>
                <GroupItems group={info.intraEuGoodsSales} />
            </>}
            <LineItem label='E1 - Intra-EU supplies of goods' amount={info.lines['e1']} />

            {info.intraEuGoodsPurchases.items.length > 0 && <>
                <Tr><Th width={100}>Intra-EU acquisitions of goods</Th></Tr>
                <GroupItems group={info.intraEuGoodsPurchases} />
            </>}
            <LineItem label='E2 - Intra-EU acquisitions of goods' amount={info.lines['e2']} />

            {info.intraEuServicesSales.items.length > 0 && <>
                <Tr><Th width={100}>Intra-EU supply of service</Th></Tr>
                <GroupItems group={info.intraEuServicesSales} />
            </>}
            <LineItem label='ES1 - Intra-EU supply of service' amount={info.lines['es1']} />

            {info.intraEuServicesPurchases.items.length > 0 && <>
                <Tr><Th width={100}>Intra-EU acquisition of services</Th></Tr>
                <GroupItems group={info.intraEuServicesPurchases} />
            </>}
            <LineItem label='ES2 - Intra-EU acquisition of services' amount={info.lines['es2']} />
        </>}

        <ExchangeRates rates={info.exchangeRates} />
    </Page></Document>
}

function LineItem({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={85}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'EUR')} EUR</ThRight>
    </Tr>
}

function LineItemSummary({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={65}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'EUR')} EUR</ThRight>
    </Tr>
}
