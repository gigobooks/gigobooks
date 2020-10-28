/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, Tr, Th, ThLeft, ThRight } from './PDFView'
import { Project, Transaction,
    datePresetDates, convertCurrency, exchangeRates, TaxItemGroup, taxItems, TaxCodeInfo } from '../core'
import { DateRange, ReportHeader, ExchangeRates } from './Reports'
import { TaxReport } from './TaxReports'
import { LineItem, LineItemSummary } from './TaxReportCA'
import { debounce, validateAmountFieldsHelper } from '../util/util'
import { GroupItems, GroupTotal } from './TransactionTaxes'
import { datePresetSelectOptions } from './SelectOptions'

type Inputs = {
    commission: boolean, h: number, i: number
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
    const items = await taxItems(startDate, endDate, true, ['CA-BC:'])
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

    if (inputs.commission) {
        if (result.lines['b'] <= 2200) {
            result.lines['c'] = result.lines['b']
        }
        else if (result.lines['b'] <= 33333) {
            result.lines['c'] = 2200
        }
        else {
            result.lines['c'] = Math.min(result.lines['b'] * 0.066, 19800)
        }
    }
    else {
        result.lines['c'] = 0
    }
    result.lines['d'] = result.lines['b'] - result.lines['c']

    result.lines['e'] = result.purchases.totals[0].amount
    result.lines['f'] = result.purchases.taxTotals[0].amount
    result.lines['g'] = result.lines['d'] + result.lines['f']

    result.lines['h'] = inputs.h
    result.lines['i'] = inputs.i
    result.lines['j'] = result.lines['h'] + result.lines['i']

    result.lines['k'] = result.lines['g'] - result.lines['j']
    return result
}

const Reports: Record<string, TaxReport[]> = {
    'CA-BC': [{id: 'st', label: 'PST Return Worksheet', element: TaxReportImpl}]
}

export default Reports

function TaxReportImpl() {
    const [summary, setSummary] = React.useState<boolean>(true)
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [commission, setCommission] = React.useState<boolean>(true)
    const [inputH, setInputH] = React.useState<string>('')
    const [inputI, setInputI] = React.useState<string>('')
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
    const [info, setInfo] = React.useState<ReportInfo>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)
    const taxId: string = Project.variables.get('ca-bc:taxId')

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
        const amounts = {h: inputH, i: inputI}
        if (validate(amounts) && startDate && endDate) {
            const parsed: Inputs = amounts as any // typecast
            reportInfo(startDate, endDate, {...parsed, commission}).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, ...debounce([commission, inputH, inputI])])

    const report = React.useMemo(() => {
        return info ? renderReport(info, taxId, summary) : null
    }, [info && nonce ? nonce : 0, taxId, summary])

    return <div>
        <h1 className='title'>PST Return Worksheet</h1>
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
        </tr><tr className='row row-commission'>
            <th scope='row'>
                <label htmlFor='commission'>Commission:</label>
            </th><td>
                <input type='checkbox' name='commission' checked={commission} onChange={e => {setCommission((e.target.checked))}} />
            </td>
        </tr><tr className='row row-inputH'>
            <th scope='row'>
                <label htmlFor='inputH'>[ H ] PST on Bad Debt Write-Off :</label>
            </th><td>
                <input name='inputH' onChange={e => {setInputH(e.target.value)}}></input> CAD
                {formErrors['h'] && <div className='error'>{formErrors['h']}</div>}
            </td>
        </tr><tr className='row row-inputI'>
            <th scope='row'>
                <label htmlFor='inputI'>[ I ] PST on Amounts Refunded or Credited to Customers:</label>
            </th><td>
                <input name='inputI' onChange={e => {setInputI(e.target.value)}}></input> CAD
                {formErrors['i'] && <div className='error'>{formErrors['i']}</div>}
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='pst-return-worksheet.pdf'>{report}</PDFView>}
    </div>
}

function renderReport(info: ReportInfo, taxId: string, summary: boolean) {
    return <Document><Page size="A4" style={[Styles.page, {fontSize: summary ? 9 : 8}]}>
        <View fixed={true}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title={`PST Return Worksheet${summary ? '' : ': Detail'}`}>
                <T style={{fontSize: 10}}>(PST {taxId})</T>
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
            <LineItemSummary label='[ A ] Total Sales and Leases' amount={info.lines['a']} />
            <LineItemSummary label='[ B ] PST Collectable on Sales and Leases' amount={info.lines['b']} />
            <LineItemSummary label='[ C ] Commission' amount={info.lines['c']} />
            <LineItemSummary label='[ D ] Net PST Due on Sales and Leases' amount={info.lines['d']} />

            <LineItemSummary label='[ E ] Purchase and Lease Price of Taxable Goods, Software and Services' amount={info.lines['e']} />
            <LineItemSummary label='[ F ] PST Due on Purchases and Leases' amount={info.lines['f']} />
            <LineItemSummary label='[ G ] PST Payable Before Adjustments' amount={info.lines['g']} />

            <LineItemSummary label='[ H ] PST on Bad Debt Write-off' amount={info.lines['h']} />
            <LineItemSummary label='[ I ] PST on Amounts Refunded or Credited to Customers' amount={info.lines['i']} />
            <LineItemSummary label='[ J ] Total Adjustments' amount={info.lines['j']} />

            <LineItemSummary label='[ K ] Total Amount Due' amount={info.lines['k']} />
        </> : <>
            {info.sales.items.length > 0 && <>
                <Tr><Th width={100}>Sales</Th></Tr>
                <GroupItems group={info.sales} />
                <GroupTotal group={info.sales} />
            </>}
            <LineItem label='[ A ] Total Sales and Leases' amount={info.lines['a']} />
            <LineItem label='[ B ] PST Collectable on Sales and Leases' amount={info.lines['b']} />
            <LineItem label='[ C ] Commission' amount={info.lines['c']} />
            <LineItem label='[ D ] Net PST Due on Sales and Leases' amount={info.lines['d']} />

            {info.purchases.items.length > 0 && <>
                <Tr><Th width={100}>Purchases</Th></Tr>
                <GroupItems group={info.purchases} />
                <GroupTotal group={info.purchases} />
            </>}
            <LineItem label='[ E ] Purchase and Lease Price of Taxable Goods, Software and Services' amount={info.lines['e']} />
            <LineItem label='[ F ] PST Due on Purchases and Leases' amount={info.lines['f']} />
            <LineItem label='[ G ] PST Payable Before Adjustments' amount={info.lines['g']} />

            <LineItem label='[ H ] PST on Bad Debt Write-off' amount={info.lines['h']} />
            <LineItem label='[ I ] PST on Amounts Refunded or Credited to Customers' amount={info.lines['i']} />
            <LineItem label='[ J ] Total Adjustments' amount={info.lines['j']} />

            <LineItem label='[ K ] Total Amount Due' amount={info.lines['k']} />
        </>}

        <ExchangeRates rates={info.exchangeRates} />
    </Page></Document>
}
