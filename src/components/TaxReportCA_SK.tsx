/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View, PDFView, Styles, Tr, Th, ThLeft, ThRight } from './PDFView'
import { Transaction, datePresetDates, convertCurrency, exchangeRates, TaxItemGroup, taxItems, TaxCodeInfo } from '../core'
import { DateRange, ReportHeader, ExchangeRates } from './Reports'
import { TaxReport } from './TaxReports'
import { LineItem, LineItemSummary } from './TaxReportCA'
import { debounce, validateAmountFieldsHelper } from '../util/util'
import { GroupItems, GroupTotal } from './TransactionTaxes'
import { datePresetSelectOptions } from './SelectOptions'

type Inputs = {
    outstanding: number
}

type ReportInfo = {
    startDate: string
    endDate: string
    sales: TaxItemGroup
    purchases: TaxItemGroup
    lines: Record<string, number>
    exchangeRates: {}
}

async function reportInfo(startDate: string, endDate: string, inputs: Inputs) : Promise<ReportInfo> {
    const items = await taxItems(startDate, endDate, true, ['CA-SK:'])
    const result: ReportInfo = { startDate, endDate,
        sales: {items: [], taxTotals: [], totals: []},
        purchases: {items: [], taxTotals: [], totals: []},
        lines: {},
        exchangeRates: exchangeRates(),
    }

    items.forEach(item => {
        convertCurrency(item, 'CAD')
        if (new TaxCodeInfo(item.taxCode).useTax) {
            result.purchases.items.push(item)
        }
        else {
            result.sales.items.push(item)
        }
    })

    ;['sales', 'purchases'].forEach(field => {
        const group: TaxItemGroup = (result as any)[field]
        if (group.items.length > 0) {
            group.taxTotals = Transaction.getSums(group.items)
            group.totals = Transaction.getSums(group.items.map(item => {
                return {...item, amount: item.parentAmount}
            }))
        }
        else {
            group.taxTotals = [{amount: 0, currency: 'CAD'}]
            group.totals = [{amount: 0, currency: 'CAD'}]
        }
    })

    result.lines['a'] = result.sales.totals[0].amount
    result.lines['b'] = result.sales.taxTotals[0].amount
    result.lines['c'] = result.purchases.taxTotals[0].amount
    result.lines['d'] = result.lines['b'] + result.lines['c']
    result.lines['e'] = inputs.outstanding
    result.lines['f'] = result.lines['d'] + result.lines['e']
    return result
}

const Reports: Record<string, TaxReport[]> = {
    'CA-SK': [{id: 'st', label: '(SK) PST Return Worksheet', element: TaxReportImpl}]
}

export default Reports

function TaxReportImpl() {
    const [summary, setSummary] = React.useState<boolean>(true)
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [outstanding, setOutstanding] = React.useState<string>('')
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
    const [info, setInfo] = React.useState<ReportInfo>()
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

    function validate(data: Record<string, string>): boolean {
        const errors = validateAmountFieldsHelper(Object.keys(data), 'CAD', data)
        setFormErrors(errors)
        return Object.keys(errors).length == 0
    }

    React.useEffect(() => {
        const amounts = {outstanding}
        if (validate(amounts) && startDate && endDate) {
            const parsed: Inputs = amounts as any // typecast
            reportInfo(startDate, endDate, parsed).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, ...debounce([outstanding])])

    const report = React.useMemo(() => {
        return info ? renderReport(info, summary) : null
    }, [info && nonce ? nonce : 0, summary])

    return <div>
        <h1 className='title'>SK PST Return Worksheet</h1>
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
        </tr><tr className='row row-outstanding'>
            <th scope='row'>
                <label htmlFor='outstanding'>Balance Owing:</label>
            </th><td>
                <input name='outstanding' onChange={e => {setOutstanding(e.target.value)}}></input> CAD
                {formErrors['outstanding'] && <div className='error'>{formErrors['outstanding']}</div>}
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='sk-pst-return-worksheet.pdf'>{report}</PDFView>}
    </div>
}

function renderReport(info: ReportInfo, summary: boolean) {
    return <Document><Page size="A4" style={[Styles.page, {fontSize: summary ? 9 : 8}]}>
        <View fixed={true}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title={`Saskatchewan PST Return Worksheet${summary ? '' : ': Detail'}`} />
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
            <LineItemSummary label='A    Total Sales' amount={info.lines['a']} />
            <LineItemSummary label='B    Net Tax Collected' amount={info.lines['b']} />

            <LineItemSummary label='C    Consumption Tax' amount={info.lines['c']} />
            <LineItemSummary label='D    Net Tax Payable (B + C)' amount={info.lines['d']} />

            <LineItemSummary label='E    Balance Owing' amount={info.lines['e']} />
            <LineItemSummary label='F    Net Amount Payable (D + E)' amount={info.lines['f']} />
        </> : <>
            {info.sales.items.length > 0 && <>
                <Tr><Th width={100}>Sales</Th></Tr>
                <GroupItems group={info.sales} />
                <GroupTotal group={info.sales} />
            </>}
            <LineItem label='A    Total Sales' amount={info.lines['a']} />
            <LineItem label='B    Net Tax Collected' amount={info.lines['b']} />

            {info.purchases.items.length > 0 && <>
                <Tr><Th width={100}>Purchases</Th></Tr>
                <GroupItems group={info.purchases} />
                <GroupTotal group={info.purchases} />
            </>}
            <LineItem label='C    Consumption Tax' amount={info.lines['c']} />
            <LineItem label='D    Net Tax Payable (B + C)' amount={info.lines['d']} />

            <LineItem label='E    Balance Owing' amount={info.lines['e']} />
            <LineItem label='F    Net Amount Payable (D + E)' amount={info.lines['f']} />
        </>}

        <ExchangeRates rates={info.exchangeRates} />
    </Page></Document>
}
