/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, Tr, Th, ThLeft, ThRight } from './PDFView'
import { Project, Transaction, toFormatted,
    datePresetDates, convertCurrency, exchangeRates, TaxItemGroup, taxItems } from '../core'
import { DateRange, ReportHeader, ExchangeRates } from './Reports'
import { TaxReport } from './TaxReports'
import { debounce, validateAmountFieldsHelper } from '../util/util'
import { GroupItems, GroupTotal } from './TransactionTaxes'
import { datePresetSelectOptions } from './SelectOptions'

type ReportInfo = {
    startDate: string
    endDate: string
    accrual: boolean
    sales: TaxItemGroup
    zeroSales: TaxItemGroup
    purchases: TaxItemGroup
    lines: Record<number, number>
    refund: boolean
    exchangeRates: {}
}

async function reportInfo(startDate: string, endDate: string, accrual: boolean, line9: number, line13: number) : Promise<ReportInfo> {
    const items = await taxItems(startDate, endDate, accrual, ['NZ'])
    const result: ReportInfo = { startDate, endDate, accrual,
        sales: {items: [], taxTotals: [], totals: []},
        zeroSales: {items: [], taxTotals: [], totals: []},
        purchases: {items: [], taxTotals: [], totals: []},
        lines: {},
        refund: false,
        exchangeRates: exchangeRates(),
    }

    items.forEach(item => {
        convertCurrency(item, 'NZD')
        if (item.drcr == Transaction.Credit) {
            result.sales.items.push(item)

            if (item.taxInfo.rate == '0') {
                result.zeroSales.items.push(item)
            }
        }
        else {
            if (item.taxInfo.rate != '0') {
                result.purchases.items.push(item)
            }
        }
    })

    ;['sales', 'zeroSales', 'purchases'].forEach(field => {
        const group: TaxItemGroup = (result as any)[field]
        if (group.items.length > 0) {
            group.taxTotals = Transaction.getSums(group.items)
            group.totals = Transaction.getSums(group.items.map(item => {
                return {...item, amount: item.grossAmount}
            }))
        }
        else {
            group.taxTotals = [{amount: 0, currency: 'NZD'}]
            group.totals = [{amount: 0, currency: 'NZD'}]
        }
    })

    result.lines[5] = result.sales.totals[0].amount
    result.lines[6] = result.zeroSales.totals[0].amount
    result.lines[7] = result.lines[5] - result.lines[6]
    result.lines[8] = result.lines[7] * 3 / 23
    result.lines[9] = line9
    result.lines[10] = result.lines[8] + result.lines[9]

    result.lines[11] = result.purchases.totals[0].amount
    result.lines[12] = result.lines[11] * 3 / 23
    result.lines[13] = line13
    result.lines[14] = result.lines[12] + result.lines[13]

    result.lines[15] = result.lines[10] - result.lines[14]
    if (result.lines[15] < 0) {
        result.lines[15] = -result.lines[15]
        result.refund = true
    }

    return result
}

const Reports: Record<string, TaxReport[]> = {
    'NZ': [{id: 'gst', label: 'GST101A helper', element: TaxReportGST}]
}

export default Reports

export function TaxReportGST() {
    const [summary, setSummary] = React.useState<boolean>(true)
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [line9, setLine9] = React.useState<string>('')
    const [line13, setLine13] = React.useState<string>('')
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
    const [info, setInfo] = React.useState<ReportInfo>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)
    const accrual: boolean = Project.variables.get('nz:accrual')
    const registration: string = Project.variables.get('nz:registration')

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

    function validate(data: Record<string, string>): boolean {
        const errors = validateAmountFieldsHelper(Object.keys(data), 'NZD', data)
        setFormErrors(errors)
        return Object.keys(errors).length == 0
    }

    React.useEffect(() => {
        const amounts = {line9, line13}
        const parsed: Record<string, number> = amounts as any // typecast
        if (validate(amounts) && startDate && endDate) {
            reportInfo(startDate, endDate, accrual, parsed.line9, parsed.line13).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, accrual, ...debounce([line9, line13])])

    const report = React.useMemo(() => {
        return info ? renderReport(info, registration, summary) : null
    }, [info && nonce ? nonce : 0, registration, summary])

    return <div>
        <h1><span className='title'>GST101A helper</span></h1>
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
        </tr><tr className='row row-line9'>
            <th scope='row'>
                <label htmlFor='line9'>[ &nbsp;&nbsp;9 ] Adjustments from your calculation sheet:</label>
            </th><td>
                <input name='line9' onChange={e => {setLine9(e.target.value)}}></input> NZD
                {formErrors['line9'] && <div className='error'>{formErrors['line9']}</div>}
            </td>
        </tr><tr className='row row-line13'>
            <th scope='row'>
                <label htmlFor='line13'>[ 13 ] Credit adjustments from your calculation sheet:</label>
            </th><td>
                <input name='line13' onChange={e => {setLine13(e.target.value)}}></input> NZD
                {formErrors['line13'] && <div className='error'>{formErrors['line13']}</div>}
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='gst-calculation-for-bas.pdf'>{report}</PDFView>}
    </div>
}

function renderReport(info: ReportInfo, registration: string, summary: boolean) {
    return <Document><Page size="A4" style={[Styles.page, {fontSize: summary ? 9 : 8}]}>
        <View fixed={true}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title={`GST101A${summary ? '' : ': Detail'}`}>
                <T style={{fontSize: 10}}>(GST {registration}, {info.accrual ? 'invoice' : 'payments'} basis)</T>
            </ReportHeader>
            {!summary && <Tr key='header' style={{marginBottom: 6}}>
                <ThLeft width={14} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                <ThLeft width={10} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                <ThLeft width={14} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                <ThLeft width={22} innerStyle={{borderBottomWidth: 1}}>Description</ThLeft>
                <Th width={8} innerStyle={{borderBottomWidth: 1}}>Tax Code</Th>
                <ThRight width={7} innerStyle={{borderBottomWidth: 1}}>Rate</ThRight>
                <ThRight width={10} innerStyle={{borderBottomWidth: 1}}>Tax</ThRight>
                <ThRight width={15} innerStyle={{borderBottomWidth: 1}}>Amount + Tax</ThRight>
            </Tr>}
        </View>

        {summary ? <>
            <LineItemSummary label='[  5 ]    Total sales and income (including GST)' amount={info.lines[5]} />
            <LineItemSummary label='[  6 ]    Zero-rated supplies' amount={info.lines[6]} />
            <LineItemSummary label='[  7 ]    Subtract Box 6 from Box 5' amount={info.lines[7]} />
            <LineItemSummary label='[  8 ]    Multiply Box 7 by three and then divide by twenty-three' amount={info.lines[8]} />
            <LineItemSummary label='[  9 ]    Adjustments from your calculation sheet' amount={info.lines[9]} />
            <LineItemSummary label='[ 10 ]    Total GST collected (Add Box 8 and Box 9)' amount={info.lines[10]} />
            <LineItemSummary label='[ 11 ]    Total purchases and expenses (including GST)' amount={info.lines[11]} />
            <LineItemSummary label='[ 12 ]    Multiply Box 11 by three and then divide by twenty-three' amount={info.lines[12]} />
            <LineItemSummary label='[ 13 ]    Credit adjustments from your calculation sheet' amount={info.lines[13]} />
            <LineItemSummary label='[ 14 ]    Total GST credit (Add Box 12 and Box 13)' amount={info.lines[14]} />
            <LineItemSummary label='[ 15 ]    Difference between Box 10 and Box 14' amount={info.lines[15]} marginBottom={3} />
            <Tr><ThRight width={80}>({info.refund ? 'Refund' : 'GST to pay'})</ThRight></Tr>
        </> : <>
            {info.sales.items.length > 0 ? <>
                <Tr><Th width={100}>[  5 ]    Total sales and income (including GST)</Th></Tr>
                <GroupItems group={info.sales} gross={true} />
                <GroupTotal group={info.sales} />
            </> :
                <LineItem label='[  5 ]    Total sales and income (including GST)' amount={info.lines[5]} />
            }

            {info.zeroSales.items.length > 0 ? <>
                <Tr><Th width={100}>[  6 ]    Zero-rated supplies</Th></Tr>
                <GroupItems group={info.zeroSales} gross={true} />
                <GroupTotal group={info.zeroSales} />
            </> :
                <LineItem label='[  6 ]    Zero-rated supplies' amount={info.lines[6]} />
            }

            <LineItem label='[  7 ]    Subtract Box 6 from Box 5' amount={info.lines[7]} />
            <LineItem label='[  8 ]    Multiply Box 7 by three and then divide by twenty-three' amount={info.lines[8]} />
            <LineItem label='[  9 ]    Adjustments from your calculation sheet' amount={info.lines[9]} />
            <LineItem label='[ 10 ]    Total GST collected (Add Box 8 and Box 9)' amount={info.lines[10]} />

            {info.purchases.items.length > 0 ? <>
                <Tr><Th width={100}>[ 11 ]    Total purchases and expenses (including GST)</Th></Tr>
                <GroupItems group={info.purchases} gross={true} />
                <GroupTotal group={info.purchases} />
            </> :
                <LineItem label='[ 11 ]    Total purchases and expenses (including GST)' amount={info.lines[11]} />
            }

            <LineItem label='[ 12 ]    Multiply Box 11 by three and then divide by twenty-three' amount={info.lines[12]} />
            <LineItem label='[ 13 ]    Credit adjustments from your calculation sheet' amount={info.lines[13]} />
            <LineItem label='[ 14 ]    Total GST credit (Add Box 12 and Box 13)' amount={info.lines[14]} />
            <View wrap={false}>
                <LineItem label='[ 15 ]    Difference between Box 10 and Box 14' amount={info.lines[15]} marginBottom={3} />
                <Tr><ThRight width={100}>({info.refund ? 'Refund' : 'GST to pay'})</ThRight></Tr>
            </View>
        </>}

        <ExchangeRates rates={info.exchangeRates} />
    </Page></Document>
}

function LineItem({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={85}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'NZD')} NZD</ThRight>
    </Tr>
}

function LineItemSummary({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={65}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'NZD')} NZD</ThRight>
    </Tr>
}
