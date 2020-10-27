/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, T, Tr, Th, ThLeft, ThRight, TdLeft, TdRight } from './PDFView'
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
    exportSales: TaxItemGroup
    otherFreeSales: TaxItemGroup
    inputTaxedSales: TaxItemGroup
    capitalPurchases: TaxItemGroup
    purchases: TaxItemGroup
    inputTaxedPurchases: TaxItemGroup
    freePurchases: TaxItemGroup
    g: Record<number, number>
    exchangeRates: {}
}

async function reportInfo(startDate: string, endDate: string, accrual: boolean, g7: number, g15: number, g18: number) : Promise<ReportInfo> {
    const items = await taxItems(startDate, endDate, accrual, ['AU:'])
    const result: ReportInfo = { startDate, endDate, accrual,
        sales: {items: [], taxTotals: [], totals: []},
        exportSales: {items: [], taxTotals: [], totals: []},
        otherFreeSales: {items: [], taxTotals: [], totals: []},
        inputTaxedSales: {items: [], taxTotals: [], totals: []},
        capitalPurchases: {items: [], taxTotals: [], totals: []},
        purchases: {items: [], taxTotals: [], totals: []},
        inputTaxedPurchases: {items: [], taxTotals: [], totals: []},
        freePurchases: {items: [], taxTotals: [], totals: []},
        g: {},
        exchangeRates: exchangeRates(),
    }

    items.forEach(item => {
        convertCurrency(item, 'AUD')
        if (item.drcr == Transaction.Credit) {
            result.sales.items.push(item)

            if (item.taxInfo.variant == 'export') {
                result.exportSales.items.push(item)
            }
            else if (item.taxInfo.variant == 'input') {
                result.inputTaxedSales.items.push(item)
            }
            else if (item.taxInfo.rate == '0') {
                result.otherFreeSales.items.push(item)
            }
        }
        else {
            if (item.taxInfo.variant == 'capital') {
                result.capitalPurchases.items.push(item)
            }
            else {
                result.purchases.items.push(item)
            }

            if (item.taxInfo.variant == 'input') {
                result.inputTaxedPurchases.items.push(item)
            }
            else if (item.taxInfo.rate == '0') {
                result.freePurchases.items.push(item)
            }
        }
    })

    ;['sales', 'exportSales', 'inputTaxedSales', 'otherFreeSales',
    'capitalPurchases', 'purchases', 'inputTaxedPurchases', 'freePurchases'].forEach(field => {
        const group: TaxItemGroup = (result as any)[field]
        if (group.items.length > 0) {
            group.taxTotals = Transaction.getSums(group.items)
            group.totals = Transaction.getSums(group.items.map(item => {
                return {...item, amount: item.grossAmount}
            }))
        }
        else {
            group.taxTotals = [{amount: 0, currency: 'AUD'}]
            group.totals = [{amount: 0, currency: 'AUD'}]
        }
    })

    // taxTotals and totals are single currency so just use [0]
    result.g[1] = result.sales.totals[0].amount
    result.g[2] = result.exportSales.totals[0].amount
    result.g[3] = result.otherFreeSales.totals[0].amount
    result.g[4] = result.inputTaxedSales.totals[0].amount
    result.g[5] = result.g[2] + result.g[3] + result.g[4]
    result.g[6] = result.g[1] - result.g[5]
    result.g[7] = g7
    result.g[8] = result.g[6] + result.g[7]
    result.g[9] = result.g[8] / 11

    result.g[10] = result.capitalPurchases.totals[0].amount
    result.g[11] = result.purchases.totals[0].amount
    result.g[12] = result.g[10] + result.g[11]
    result.g[13] = result.inputTaxedPurchases.totals[0].amount
    result.g[14] = result.freePurchases.totals[0].amount
    result.g[15] = g15
    result.g[16] = result.g[13] + result.g[14] + result.g[15]
    result.g[17] = result.g[12] - result.g[16]
    result.g[18] = g18
    result.g[19] = result.g[17] + result.g[18]
    result.g[20] = result.g[19] / 11
    return result
}

const Reports: Record<string, TaxReport[]> = {
    'AU': [{id: 'gst', label: 'GST calculation for BAS', element: TaxReportGST}]
}

export default Reports

export function TaxReportGST() {
    const [summary, setSummary] = React.useState<boolean>(true)
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [g7, setG7] = React.useState<string>('')
    const [g15, setG15] = React.useState<string>('')
    const [g18, setG18] = React.useState<string>('')
    const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
    const [info, setInfo] = React.useState<ReportInfo>()
    const [error, setError] = React.useState<string>('')
    const [nonce, setNonce] = React.useState<number>(0)
    const accrual: boolean = Project.variables.get('au:accrual')
    const taxId: string = Project.variables.get('au:taxId')

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
        const errors = validateAmountFieldsHelper(Object.keys(data), 'AUD', data)
        setFormErrors(errors)
        return Object.keys(errors).length == 0
    }

    React.useEffect(() => {
        const amounts = {g7, g15, g18}
        const parsed: Record<string, number> = amounts as any // typecast
        if (validate(amounts) && startDate && endDate) {
            reportInfo(startDate, endDate, accrual, parsed.g7, parsed.g15, parsed.g18).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, accrual, ...debounce([g7, g15, g18])])

    const report = React.useMemo(() => {
        return info ? renderReport(info, taxId, summary) : null
    }, [info && nonce ? nonce : 0, taxId, summary])

    return <div>
        <h1 className='title'>GST calculation for BAS</h1>
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
        </tr><tr className='row row-g7'>
            <th scope='row'>
                <label htmlFor='g7'>G7 Adjustments (if applicable):</label>
            </th><td>
                <input name='g7' onChange={e => {setG7(e.target.value)}}></input> AUD
                {formErrors['g7'] && <div className='error'>{formErrors['g7']}</div>}
            </td>
        </tr><tr className='row row-g15'>
            <th scope='row'>
                <label htmlFor='g15'>G15 Estimated purchases for private use<br />or not income tax deductible:</label>
            </th><td>
                <input name='g15' onChange={e => {setG15(e.target.value)}}></input> AUD
                {formErrors['g15'] && <div className='error'>{formErrors['g15']}</div>}
            </td>
        </tr><tr className='row row-g18'>
            <th scope='row'>
                <label htmlFor='g18'>G18 Adjustments (if applicable):</label>
            </th><td>
                <input name='g18' onChange={e => {setG18(e.target.value)}}></input> AUD
                {formErrors['g18'] && <div className='error'>{formErrors['g18']}</div>}
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename='gst-calculation-for-bas.pdf'>{report}</PDFView>}
    </div>
}

function renderReport(info: ReportInfo, taxId: string, summary: boolean) {
    return <Document><Page size="A4" style={[Styles.page, {fontSize: summary ? 9 : 8}]}>
        <View fixed={true}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title={`GST calculation for BAS${summary ? '' : ': Detail'}`}>
                <T style={{fontSize: 10}}>(ABN {taxId}, {info.accrual ? 'accruals' : 'cash'} basis)</T>
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
            <SummaryG label='G1    Total sales (including any GST)' amount={info.g[1]} comment='G1 on the BAS' />
            <SummaryG label='G2    Export sales' amount={info.g[2]} comment='G2 on the BAS' />
            <SummaryG label='G3    Other GST-free sales' amount={info.g[3]} comment='G3 on the BAS' />
            <SummaryG label='G4    Input taxed sales' amount={info.g[3]} />
            <SummaryG label='G5    G2+G3+G4' amount={info.g[5]} />
            <SummaryG label='G6    Total sales subject to GST (G1 minus G5)' amount={info.g[6]} />
            <SummaryG label='G7    Adjustments (if applicable)' amount={info.g[7]} />
            <SummaryG label='G8    Total sales subject to GST after adjustments (G6+G7)' amount={info.g[8]} />
            <SummaryG label='G9    GST on sales (G8 divided by eleven)' amount={info.g[9]} comment='1A in the Summary section of the BAS' marginBottom={24} />

            <SummaryG label='G10   Capital purchases (including any GST)' amount={info.g[10]} comment='G10 on the BAS' />
            <SummaryG label='G11   Non-capital purchases (including any GST)' amount={info.g[11]} comment='G11 on the BAS' />
            <SummaryG label='G12   G10+G11' amount={info.g[12]} />
            <SummaryG label='G13   Purchases for making input taxed sales' amount={info.g[13]} />
            <SummaryG label='G14   Purchases without GST in the price' amount={info.g[14]} />
            <SummaryG label='G15   Estimated purchases for private use or not income tax deductible' amount={info.g[15]} />
            <SummaryG label='G16   G13+G14+G15' amount={info.g[16]} />
            <SummaryG label='G17   Total purchases subject to GST (G12 minus G16)' amount={info.g[17]} />
            <SummaryG label='G18   Adjustments (if applicable)' amount={info.g[18]} />
            <SummaryG label='G19   Total purchases subject to GST after adjustments (G7+G18)' amount={info.g[19]} />
            <SummaryG label='G20   GST on purchases (G19 divided by eleven)' amount={info.g[20]} comment='1B in the Summary section of the BAS' />
        </> : <>
            {info.sales.items.length > 0 ? <>
                <Tr><Th width={100}>G1    Total sales (including any GST)</Th></Tr>
                <GroupItems group={info.sales} gross={true} />
                <GroupTotal group={info.sales} marginBottom={0} />
            </> :
                <G label='G1    Total sales (including any GST)' amount={info.g[1]} marginBottom={0} />
            }
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(G1 on the BAS)</TdRight></Tr>

            {info.exportSales.items.length > 0 ? <>
                <Tr><Th width={100}>G2    Export sales</Th></Tr>
                <GroupItems group={info.exportSales} gross={true} />
                <GroupTotal group={info.exportSales} marginBottom={0} />
            </> :
                <G label='G2    Export sales' amount={info.g[2]} marginBottom={0} />
            }
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(G2 on the BAS)</TdRight></Tr>

            {info.otherFreeSales.items.length > 0 ? <>
                <Tr><Th width={100}>G3    Other GST-free sales</Th></Tr>
                <GroupItems group={info.otherFreeSales} gross={true} />
                <GroupTotal group={info.otherFreeSales} marginBottom={0} />
            </> :
                <G label='G3    Other GST-free sales' amount={info.g[3]} marginBottom={0} />
            }
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(G3 on the BAS)</TdRight></Tr>

            {info.inputTaxedSales.items.length > 0 ? <>
                <Tr><Th width={100}>G4    Input taxed sales</Th></Tr>
                <GroupItems group={info.inputTaxedSales} gross={true} />
                <GroupTotal group={info.inputTaxedSales} />
            </> :
                <G label='G4    Input taxed sales' amount={info.g[3]} />
            }

            <G label='G5    G2+G3+G4' amount={info.g[5]} />
            <G label='G6    Total sales subject to GST (G1 minus G5)' amount={info.g[6]} />
            <G label='G7    Adjustments (if applicable)' amount={info.g[7]} />
            <G label='G8    Total sales subject to GST after adjustments (G6+G7)' amount={info.g[8]} />
            <G label='G9    GST on sales (G8 divided by eleven)' amount={info.g[9]} marginBottom={0} />
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(1A in the Summary section of the BAS)</TdRight></Tr>

            {info.capitalPurchases.items.length > 0 ? <>
                <Tr><Th width={100}>G10   Capital purchases (including any GST)</Th></Tr>
                <GroupItems group={info.capitalPurchases} gross={true} />
                <GroupTotal group={info.capitalPurchases} marginBottom={0} />
            </> :
                <G label='G10   Capital purchases (including any GST)' amount={info.g[10]} marginBottom={0} />
            }
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(G10 on the BAS)</TdRight></Tr>

            {info.purchases.items.length > 0 ? <>
                <Tr><Th width={100}>G11   Non-capital purchases (including any GST)</Th></Tr>
                <GroupItems group={info.purchases} gross={true} />
                <GroupTotal group={info.purchases} marginBottom={0} />
            </> :
                <G label='G11   Non-capital purchases (including any GST)' amount={info.g[11]} marginBottom={0} />
            }
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(G11 on the BAS)</TdRight></Tr>

            <G label='G12   G10+G11' amount={info.g[12]} />

            {info.inputTaxedPurchases.items.length > 0 ? <>
                <Tr><Th width={100}>G13   Purchases for making input taxed sales</Th></Tr>
                <GroupItems group={info.inputTaxedPurchases} gross={true} />
                <GroupTotal group={info.inputTaxedPurchases} />
            </> :
                <G label='G13   Purchases for making input taxed sales' amount={info.g[13]} />
            }

            {info.freePurchases.items.length > 0 ? <>
                <Tr><Th width={100}>G14   Purchases without GST in the price</Th></Tr>
                <GroupItems group={info.freePurchases} gross={true} />
                <GroupTotal group={info.freePurchases} />
            </> :
                <G label='G14   Purchases without GST in the price' amount={info.g[14]} />
            }

            <G label='G15   Estimated purchases for private use or not income tax deductible' amount={info.g[15]} />
            <G label='G16   G13+G14+G15' amount={info.g[16]} />
            <G label='G17   Total purchases subject to GST (G12 minus G16)' amount={info.g[17]} />
            <G label='G18   Adjustments (if applicable)' amount={info.g[18]} />
            <G label='G19   Total purchases subject to GST after adjustments (G7+G18)' amount={info.g[19]} />
            <G label='G20   GST on purchases (G19 divided by eleven)' amount={info.g[20]} marginBottom={0} />
            <Tr style={{marginBottom: 12}}><TdRight width={100}>(1B in the Summary section of the BAS)</TdRight></Tr>
        </>}

        <ExchangeRates rates={info.exchangeRates} />
    </Page></Document>
}

function G({label, amount, marginBottom = 12}: {label: string, amount: number, marginBottom?: number}) {
    return <>
        <Tr key={label} style={{marginBottom}}>
            <ThLeft width={85}>{label}</ThLeft>
            <ThRight width={15}>{toFormatted(amount, 'AUD')} AUD</ThRight>
        </Tr>
    </>
}

function SummaryG({label, amount, comment, marginBottom = 12}: {label: string, amount: number, comment?: string, marginBottom?: number}) {
    return <Tr key={label} style={{marginBottom}}>
        <ThLeft width={65}>{label}</ThLeft>
        <ThRight width={15}>{toFormatted(amount, 'AUD')} AUD</ThRight>
        <TdLeft width={20} innerStyle={{marginLeft: 16}}>{comment}</TdLeft>
    </Tr>
}
