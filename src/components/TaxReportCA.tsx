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

type Inputs = {
    line104: number, line107: number, line110: number, line111: number, line205: number, line405: number
}

type ReportInfo = {
    startDate: string
    endDate: string
    sales: TaxItemGroup
    purchases: TaxItemGroup
    lines: Record<number | string, number>
    refund: boolean
    exchangeRates: {}
}

async function reportInfo(startDate: string, endDate: string, inputs: Inputs) : Promise<ReportInfo> {
    const items = await taxItems(startDate, endDate, true, ['CA:'])
    const result: ReportInfo = { startDate, endDate,
        sales: {items: [], taxTotals: [], totals: []},
        purchases: {items: [], taxTotals: [], totals: []},
        lines: {},
        refund: false,
        exchangeRates: exchangeRates(),
    }

    items.forEach(item => {
        convertCurrency(item, 'CAD')
        if (item.drcr == Transaction.Credit) {
            result.sales.items.push(item)
        }
        else {
            result.purchases.items.push(item)
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

    result.lines[101] = result.sales.totals[0].amount
    result.lines[103] = result.sales.taxTotals[0].amount
    result.lines[104] = inputs.line104
    result.lines[105] = result.lines[103] + result.lines[104]

    result.lines[106] = result.purchases.taxTotals[0].amount
    result.lines[107] = inputs.line107
    result.lines[108] = result.lines[106] + result.lines[107]
    result.lines[109] = result.lines[105] - result.lines[108]

    result.lines[110] = inputs.line110
    result.lines[111] = inputs.line111
    result.lines[112] = result.lines[110] + result.lines[111]
    result.lines['113a'] = result.lines[109] - result.lines[112]

    result.lines[205] = inputs.line205
    result.lines[405] = inputs.line405
    result.lines['113b'] = result.lines[205] + result.lines[405]
    result.lines['113c'] = result.lines['113a'] + result.lines['113b']

    if (result.lines['113c'] >= 0) {
        result.lines[115] = result.lines['113c']
    }
    else {
        result.lines[114] = -result.lines['113c']
        result.refund = true
    }
    return result
}

const Reports: Record<string, TaxReport[]> = {
    'CA': [{id: 'gst', label: 'GST/HST Return', element: TaxReportGST}]
}

export default Reports

export function TaxReportGST() {
    const [summary, setSummary] = React.useState<boolean>(true)
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [line104, setLine104] = React.useState<string>('')
    const [line107, setLine107] = React.useState<string>('')
    const [line110, setLine110] = React.useState<string>('')
    const [line111, setLine111] = React.useState<string>('')
    const [line205, setLine205] = React.useState<string>('')
    const [line405, setLine405] = React.useState<string>('')
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
    const [info, setInfo] = React.useState<ReportInfo>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)
    const taxId: string = Project.variables.get('ca:taxId')

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
        const amounts = {line104, line107, line110, line111, line205, line405}
        const parsed: Inputs = amounts as any // typecast
        if (validate(amounts) && startDate && endDate) {
            reportInfo(startDate, endDate, parsed).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, ...debounce([line104, line107, line110, line111, line205, line405])])

    const report = React.useMemo(() => {
        return info ? renderReport(info, taxId, summary) : null
    }, [info && nonce ? nonce : 0, taxId, summary])

    return <div>
        <h1 className='title'>GST/HST Return Working Copy</h1>
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
        </tr><tr className='row row-line104'>
            <th scope='row'>
                <label htmlFor='line104'>Line 104 | Adjustments to be added:</label>
            </th><td>
                <input name='line104' onChange={e => {setLine104(e.target.value)}}></input> CAD
                {formErrors['line104'] && <div className='error'>{formErrors['line104']}</div>}
            </td>
        </tr><tr className='row row-line107'>
            <th scope='row'>
                <label htmlFor='line107'>Line 107 | Adjustments to be deducted:</label>
            </th><td>
                <input name='line107' onChange={e => {setLine107(e.target.value)}}></input> CAD
                {formErrors['line107'] && <div className='error'>{formErrors['line107']}</div>}
            </td>
        </tr><tr className='row row-line110'>
            <th scope='row'>
                <label htmlFor='line110'>Line 110 | Instalment and other annual filer payments:</label>
            </th><td>
                <input name='line110' onChange={e => {setLine110(e.target.value)}}></input> CAD
                {formErrors['line110'] && <div className='error'>{formErrors['line110']}</div>}
            </td>
        </tr><tr className='row row-line111'>
            <th scope='row'>
                <label htmlFor='line111'>Line 111 | GST and HST rebates:</label>
            </th><td>
                <input name='line111' onChange={e => {setLine111(e.target.value)}}></input> CAD
                {formErrors['line111'] && <div className='error'>{formErrors['line111']}</div>}
            </td>
        </tr><tr className='row row-line205'>
            <th scope='row'>
                <label htmlFor='line205'>Line 205 | GST/HST due on acquisition of taxable real property:</label>
            </th><td>
                <input name='line205' onChange={e => {setLine205(e.target.value)}}></input> CAD
                {formErrors['line205'] && <div className='error'>{formErrors['line205']}</div>}
            </td>
        </tr><tr className='row row-line405'>
            <th scope='row'>
                <label htmlFor='line405'>Line 405 | Other GST/HST to be self-assessed:</label>
            </th><td>
                <input name='line405' onChange={e => {setLine405(e.target.value)}}></input> CAD
                {formErrors['line405'] && <div className='error'>{formErrors['line405']}</div>}
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='GST-HST-return-working-copy.pdf'>{report}</PDFView>}
    </div>
}

function renderReport(info: ReportInfo, taxId: string, summary: boolean) {
    return <Document><Page size="A4" style={[Styles.page, {fontSize: summary ? 9 : 8}]}>
        <View fixed={true}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title={`GST/HST Return Working Copy${summary ? '' : ': Detail'}`}>
                <T style={{fontSize: 10}}>(GST {taxId})</T>
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
            <LineItemSummary label='Line 101 | Sales and other revenue' amount={info.lines[101]} />
            <LineItemSummary label='Line 103 | GST and HST amounts you collected or is collectible' amount={info.lines[103]} />
            <LineItemSummary label='Line 104 | Adjustments to be added' amount={info.lines[104]} />
            <LineItemSummary label='Line 105 | Total GST/HST and adjustments (add lines 103 and 104)' amount={info.lines[105]} />

            <LineItemSummary label='Line 106 | GST/HST you paid or is payable' amount={info.lines[106]} />
            <LineItemSummary label='Line 107 | Adjustments to be deducted' amount={info.lines[107]} />
            <LineItemSummary label='Line 108 | Total ITCs and adjustments (add lines 106 and 107)' amount={info.lines[108]} />
            <LineItemSummary label='Line 109 | Net tax (subtract line 108 from line 105)' amount={info.lines[109]} />

            <LineItemSummary label='Line 110 | Instalment and other annual filer payments' amount={info.lines[110]} />
            <LineItemSummary label='Line 111 | GST and HST rebates' amount={info.lines[111]} />
            <LineItemSummary label='Line 112 | Total other credits (add lines 110 and 111)' amount={info.lines[112]} />
            <LineItemSummary label='Line 113 A | Balance (subtract line 112 from line 109)' amount={info.lines['113a']} />

            <LineItemSummary label='Line 205 | GST/HST due on acquisition of taxable real property' amount={info.lines[205]} />
            <LineItemSummary label='Line 405 | Other GST/HST to be self-assessed' amount={info.lines[405]} />
            <LineItemSummary label='Line 113 B | Total other debits (add lines 205 and 405)' amount={info.lines['113b']} />
            <LineItemSummary label='Line 113 C | Balance (add lines 113 A and 113 B)' amount={info.lines['113c']} />

            {info.refund ? <LineItemSummary label='Line 114 | Refund claimed' amount={info.lines[114]} />
                : <LineItemSummary label='Line 115 | Payment enclosed' amount={info.lines[115]} />
            }
        </> : <>
            {info.sales.items.length > 0 && <>
                <Tr><Th width={100}>Sales</Th></Tr>
                <GroupItems group={info.sales} />
                <GroupTotal group={info.sales} />
            </>}
            <LineItem label='Line 101 | Sales and other revenue' amount={info.lines[101]} />
            <LineItem label='Line 103 | GST and HST amounts you collected or is collectible' amount={info.lines[103]} />
            <LineItem label='Line 104 | Adjustments to be added' amount={info.lines[104]} />
            <LineItem label='Line 105 | Total GST/HST and adjustments (add lines 103 and 104)' amount={info.lines[105]} />

            {info.purchases.items.length > 0 && <>
                <Tr><Th width={100}>Purchases</Th></Tr>
                <GroupItems group={info.purchases} />
                <GroupTotal group={info.purchases} />
            </>}
            <LineItem label='Line 106 | GST/HST you paid or is payable' amount={info.lines[106]} />
            <LineItem label='Line 107 | Adjustments to be deducted' amount={info.lines[107]} />
            <LineItem label='Line 108 | Total ITCs and adjustments (add lines 106 and 107)' amount={info.lines[108]} />
            <LineItem label='Line 109 | Net tax (subtract line 108 from line 105)' amount={info.lines[109]} />

            <LineItem label='Line 110 | Instalment and other annual filer payments' amount={info.lines[110]} />
            <LineItem label='Line 111 | GST and HST rebates' amount={info.lines[111]} />
            <LineItem label='Line 112 | Total other credits (add lines 110 and 111)' amount={info.lines[112]} />
            <LineItem label='Line 113 A | Balance (subtract line 112 from line 109)' amount={info.lines['113a']} />

            <LineItem label='Line 205 | GST/HST due on acquisition of taxable real property' amount={info.lines[205]} />
            <LineItem label='Line 405 | Other GST/HST to be self-assessed' amount={info.lines[405]} />
            <LineItem label='Line 113 B | Total other debits (add lines 205 and 405)' amount={info.lines['113b']} />
            <LineItem label='Line 113 C | Balance (add lines 113 A and 113 B)' amount={info.lines['113c']} />

            {info.refund ? <LineItem label='Line 114 | Refund claimed' amount={info.lines[114]} />
                : <LineItem label='Line 115 | Payment enclosed' amount={info.lines[115]} />
            }
        </>}

        <ExchangeRates rates={info.exchangeRates} />
    </Page></Document>
}

function LineItem({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={85}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'CAD')} CAD</ThRight>
    </Tr>
}

function LineItemSummary({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={65}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'CAD')} CAD</ThRight>
    </Tr>
}
