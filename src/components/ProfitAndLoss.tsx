/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Transaction, formatDateOnly, toFormattedAbs,
    Money, ProfitAndLoss, profitAndLoss, datePresetDates } from '../core'
import { CURRENCY_TOTALS_WRAP, DateRange, ReportHeader, ExchangeRates } from './Reports'
import { currencySelectOptions, datePresetSelectOptions } from './SelectOptions'

export function ProfitAndLoss({summary}: {summary?: boolean}) {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [currency, setCurrency] = React.useState<string>('')
    const [info, setInfo] = React.useState<ProfitAndLoss>()
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

    function onCurrencyChange(e: any) {
        setCurrency(e.target.value)
    }

    React.useEffect(() => {
        if (startDate && endDate) {
            profitAndLoss(startDate, endDate, currency).then(data => {
                setInfo(data)
                setError('')
                setNonce(Date.now())
            }).catch(e => {
                setError(e.toString())
            })
        }
    }, [startDate, endDate, currency])

    const report = React.useMemo(() => {
        return info ? <Document>{summary ? <Page size="A4" style={[Styles.page, {fontSize: 9}]}>
            <View fixed={true}>
                <ReportHeader startDate={info.startDate} endDate={info.endDate} title='Profit and Loss: Summary' />
            </View>

            {info.hasOperations ? <DivisionSummary
                label='Ordinary revenue / expense'
                netLabel='Earnings before interest, tax, depreciation and amortisation (EBITDA)'
                division={info.operations} 
            /> : <>
                <Tr key='label' style={{marginBottom: 3}}><Th width={60}>Ordinary revenue / expense</Th></Tr>
                <Tr key='none'><Td indent={2} width={58}>No items</Td></Tr>
            </>}

            {info.hasDepreciation && <DivisionSummary
                label='Depreciation and amortisation'
                netLabel='Net depreciation and amortisation'
                division={info.depreciation} 
            />}
            <Totals key='ebit' totals={info.ebit} width={60} label='Earnings before interest and tax (EBIT)' />

            {info.hasInterestTax && <DivisionSummary
                label='Interest and tax'
                netLabel='Net interest and tax'
                division={info.interestTax} 
            />}
            <Totals key='netProfit' totals={info.netProfit} width={60} label='Net profit' />
            <ExchangeRates rates={info.exchangeRates} />
        </Page> :
        <Page size="A4" style={[Styles.page, {fontSize: 9}]}>
            <View fixed={true}>
                <ReportHeader startDate={info.startDate} endDate={info.endDate} title='Profit and Loss: Detail' />
                <Tr key='header' style={{marginBottom: 6}}>
                    <ThLeft width={18} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                    <ThLeft width={11} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                    <ThLeft width={20} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                    <Th width={34} innerStyle={{borderBottomWidth: 1}}>Description</Th>
                    <ThRight width={17} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
                </Tr>
            </View>

            {info.hasOperations ? <DivisionDetail
                label='Ordinary revenue / expense'
                netLabel='Earnings before interest, tax, depreciation and amortisation (EBITDA)'
                division={info.operations} 
            /> : <>
                <Tr key='label' style={{marginBottom: 3}}><Th width={100}>Ordinary revenue / expense</Th></Tr>
                <Tr key='none'><Td indent={2} width={98}>No items</Td></Tr>
            </>}

            {info.hasDepreciation && <DivisionDetail
                label='Depreciation and amortisation'
                netLabel='Net depreciation and amortisation'
                division={info.depreciation} 
            />}
            <Totals key='ebit' totals={info.ebit} label='Earnings before interest and tax (EBIT)' />

            {info.hasInterestTax && <DivisionDetail
                label='Interest and tax'
                netLabel='Net interest and tax'
                division={info.interestTax} 
            />}
            <Totals key='netProfit' totals={info.netProfit} label='Net profit' />
            <ExchangeRates rates={info.exchangeRates} />
        </Page>}</Document> : null
    }, [summary, info && nonce ? nonce : 0])

    return <div>
        <h1 className='title'>Profit and Loss: {summary ? 'Summary' : 'Detail'}</h1>
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
            </tr><tr className='row row-currency'>
            <th scope='row'>
                <label htmlFor='currency'>Currency:</label>
            </th><td>
                <select name='currency' value={currency} onChange={onCurrencyChange}>
                    <option key='' value=''>All currencies</option>
                    {currencySelectOptions()}
                </select>
            </td>
        </tr></tbody></table>

        {error && <div className='error'>{error}</div>}
        {report && <PDFView _key={nonce} filename={`profit-and-loss-${summary ? 'summary' : 'detail'}.pdf`}>{report}</PDFView>}
    </div>
}

type DivisionProps = {
    label: string
    netLabel: string
    division: ProfitAndLoss['operations']
}

function DivisionDetail({label, netLabel, division}: DivisionProps) {
    return <>
        <Tr key='label' style={{marginBottom: 3}}><Th width={100}>{label}</Th></Tr>
 
        {division.revenues.groups.length > 0 && <Tr key='revenue' style={{marginBottom: 3}}><Th indent={2} width={98}>Revenue</Th></Tr>}
        {division.revenues.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            <Tr key='group-title' style={{marginBottom: 3}}><Th indent={4} width={96}>{group.accountTitle}</Th></Tr>
            {group.items.map((item, index) => {
                return <Tr key={item.id}>
                    <TdLeft width={14} indent={4}>{Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}</TdLeft>
                    <Td width={11} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                    <TdLeft width={20} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
                    <Td width={34} innerStyle={{maxLines: 2}}>{
                        !item.txnDescription ? item.description :
                        !item.description ? item.txnDescription :
                        `${item.txnDescription}: ${item.description}`
                    }</Td>
                    <TdRight width={17} innerStyle={index == group.items.length - 1 ? {
                        marginBottom: 3,
                        paddingBottom: 3,
                        borderBottomWidth: 1,
                    } : {}}>{toFormattedAbs(item.amount, item.currency)} {item.currency}</TdRight>
                </Tr>
            })}

            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 12,
                    } : {}}>
                    <TdLeft width={79} indent={4}>
                        {index == 0 ? `Total ${group.accountTitle}` : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.revenues.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.revenues.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.revenues.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={81} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Revenue' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        {division.expenses.groups.length > 0 && <Tr key='expenses' style={{marginBottom: 3}}><Th indent={2} width={98}>Expenses</Th></Tr>}
        {division.expenses.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            <Tr key='group-title' style={{marginBottom: 3}}><Th indent={4} width={96}>{group.accountTitle}</Th></Tr>
            {group.items.map((item, index) => {
                return <Tr key={item.id}>
                    <TdLeft width={14} indent={4}>{Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}</TdLeft>
                    <Td width={11} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                    <TdLeft width={20} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
                    <Td width={34} innerStyle={{maxLines: 2}}>{
                        !item.txnDescription ? item.description :
                        !item.description ? item.txnDescription :
                        `${item.txnDescription}: ${item.description}`
                    }</Td>
                    <TdRight width={17} innerStyle={index == group.items.length - 1 ? {
                        marginBottom: 3,
                        paddingBottom: 3,
                        borderBottomWidth: 1,
                    } : {}}>{toFormattedAbs(item.amount, item.currency)} {item.currency}</TdRight>
                </Tr>
            })}

            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 12,
                    } : {}}>
                    <TdLeft width={79} indent={4}>
                        {index == 0 ? `Total ${group.accountTitle}` : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.expenses.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.expenses.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.expenses.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={81} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Expenses' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        <Totals totals={division.netTotals} label={netLabel} />
    </>
}

type TotalsProps = {
    label: string
    totals: Money[]
    width?: number
}

function Totals({label, totals, width = 100}: TotalsProps) {
    // Keep totals together unless there are a lot of currencies
    return <View wrap={totals.length > CURRENCY_TOTALS_WRAP} style={{marginBottom: 12}}>
        {totals.map((money, index) => {
            return <Tr key={money.currency}>
                <ThLeft width={width - 15} style={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 2,
                    borderColor: '#fff', // transparent
                } : {}} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 2,
                    borderColor: '#fff', // transparent
                    position: 'absolute',
                } : {}}>{index == 0 ? `${label}` : ''}</ThLeft>
                <ThRight width={15} style={{
                    borderTopWidth: index == 0 ? 2 : 0,
                    paddingTop: index == 0 ? 3 : 0,
                    borderBottomWidth: index == totals.length-1 ? 2 : 0,
                    paddingBottom: index == totals.length-1 ? 3 : 0,
                }}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
    </View>
}

function DivisionSummary({label, netLabel, division}: DivisionProps) {
    return <>
        <Tr key='label' style={{marginBottom: 3}}><Th width={60}>{label}</Th></Tr>
 
        {division.revenues.groups.length > 0 && <Tr key='revenue' style={{marginBottom: 3}}><Th indent={2} width={58}>Revenue</Th></Tr>}
        {division.revenues.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 3,
                    } : {}}>
                    <TdLeft width={39} indent={4}>
                        {index == 0 ? group.accountTitle : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.revenues.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.revenues.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.revenues.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={41} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Revenue' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        {division.expenses.groups.length > 0 && <Tr key='expenses' style={{marginBottom: 3}}><Th indent={2} width={58}>Expenses</Th></Tr>}
        {division.expenses.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 3,
                    } : {}}>
                    <TdLeft width={39} indent={4}>
                        {index == 0 ? group.accountTitle : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.expenses.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.expenses.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.expenses.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={41} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Expenses' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        <Totals totals={division.netTotals} label={netLabel} width={60}/>
    </>
}
