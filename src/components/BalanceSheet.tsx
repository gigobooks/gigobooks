/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, B, T, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Transaction, TransactionType, formatDateOnly, toFormatted,
    Money, BalanceSheet, balanceSheet, datePresetDates } from '../core'
import { CURRENCY_TOTALS_WRAP, DateRange, ReportHeader } from './Reports'

const Debit = Transaction.Debit
const Credit = Transaction.Credit

export function BalanceSheetLog() {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [info, setInfo] = React.useState<BalanceSheet>()

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
            balanceSheet(startDate, endDate).then(data => {
                setInfo(data)
            })
        }
    }, [startDate, endDate])

    const report = React.useMemo(() => {
        return info ? <Document><Page size='A4' style={[Styles.page, {fontSize: 9}]}>
            <ReportHeader startDate={info.startDate} endDate={info.endDate} title='Balance Sheet: Log' />

            <Tr key='header' style={{marginBottom: 6}}>
                <ThLeft width={18} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                <ThLeft width={11} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                <ThLeft width={17} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                <Th width={20} innerStyle={{borderBottomWidth: 1}}>Description</Th>
                <ThRight width={17} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
                <ThRight width={17} innerStyle={{borderBottomWidth: 1}}>Balance</ThRight>
            </Tr>

            <Tr key='assets' style={{marginBottom: 3}}><Th width={100}>ASSETS</Th></Tr>
            <SubdivisionLog label='Current assets' subdivision={info.assets.current} drcr={Debit}/>
            <Subtotals totals={info.assets.current.totals} label='Total current assets' />
            <SubdivisionLog label='Non-current assets' subdivision={info.assets.nonCurrent} drcr={Debit} />
            <Subtotals totals={info.assets.nonCurrent.totals} label='Total non-current assets' />
            <Totals totals={info.assets.totals} label='TOTAL ASSETS' />

            <Tr key='liabilities' style={{marginBottom: 3}}><Th width={100}>LIABILITIES</Th></Tr>
            <SubdivisionLog label='Current liabilities' subdivision={info.liabilities.current} drcr={Credit} />
            <Subtotals totals={info.liabilities.current.totals} label='Total current liabilities' />
            <SubdivisionLog label='Non-current liabilities' subdivision={info.liabilities.nonCurrent} drcr={Credit} />
            <Subtotals totals={info.liabilities.nonCurrent.totals} label='Total non-current liabilities' />
            <Totals totals={info.liabilities.totals} label='TOTAL LIABILITIES' />

            <Totals totals={info.netAssets} label='NET ASSETS' />

            <Tr key='label' style={{marginBottom: 3}}><Th width={100}>EQUITY</Th></Tr>
            <SubdivisionLog label={false} subdivision={info.equity.accounts} drcr={Credit} />
            <Totals totals={info.equity.accounts.totals} label='TOTAL EQUITY' />
        </Page></Document> : null
    }, [info])

    return <div>
        <h1><span className='title'>Balance Sheet: Log</span></h1>
        <div>
            <span className='date-preset'>
                <label htmlFor='preset'>Date:</label>
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
            </span>
            {preset == 'custom' && <DateRange onChange={onDateChange} startDate={startDate} endDate={endDate} />}
        </div>

        {report && <PDFView filename='balance-sheet-log.pdf'>{report}</PDFView>}
    </div>
}

function SubdivisionLog({label, subdivision, drcr}: {label: string | false, subdivision: BalanceSheet['assets']['current'], drcr: number}) {
    return <>
        {subdivision.groups.length > 0 && label && <Tr key={label} style={{marginBottom: 3}}><Th indent={2} width={98}>{label}</Th></Tr>}
        {subdivision.groups.map(group => {
            const hasItems = group.items.length > 0

            return <React.Fragment key={`group-${group.accountId}`}>
            {hasItems && group.openingBalance.map((money, index) => {
                return <Tr key={money.currency} style={index == group.openingBalance.length - 1 ? {
                        marginBottom: 3,
                    } : {}}>
                    <TdLeft width={79} indent={4}>
                        {index == 0 ? <T><B>{group.accountTitle}</B> (opening balance)</T> : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormatted(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}

            {group.items.map((item, index) => {
                // If the item's drcr and the division's drcr don't match, then negate amount
                const amount = drcr == item.drcr ? item.amount : -item.amount
                return <Tr key={item.id}>
                    <TdLeft width={14} indent={4}>
                        {item.txnType && Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}
                    </TdLeft>
                    <Td width={11} innerStyle={{marginRight: 6, textAlign: 'right'}}>{item.txnDate && formatDateOnly(item.txnDate)}</Td>
                    <TdLeft width={17} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
                    <Td width={20} innerStyle={{maxLines: 2}}>{
                        !item.txnDescription ? item.description :
                        !item.description ? item.txnDescription :
                        `${item.txnDescription}: ${item.description}`
                    }</Td>
                    <TdRight width={17} innerStyle={index == group.items.length - 1 ? {
                        paddingBottom: 3,
                    } : {}}>{toFormatted(amount, item.currency)} {item.currency}</TdRight>
                    <TdRight width={17}>&nbsp;</TdRight>
                </Tr>
            })}

            {group.closingBalance.map((money, index) => {
                return <Tr key={money.currency} style={index == group.closingBalance.length - 1 ? {
                        marginBottom: 6,
                    } : {}}>
                    <TdLeft width={79} indent={4}>
                        {index == 0 ? <T><B>{group.accountTitle}</B> ({hasItems ? 'closing balance' : 'no activity'})</T> : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormatted(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>})}
    </>
}

type TotalsProps = {
    label: string
    totals: Money[]
    width?: number
}

function Subtotals({label, totals, width = 100}: TotalsProps) {
    return <View wrap={totals.length > CURRENCY_TOTALS_WRAP} style={{marginBottom: 6}}>
        {totals.map((money, index) => {
            return <Tr key={money.currency}>
                <ThLeft indent={2} width={width - 17} style={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: '#fff', // transparent
                    position: 'absolute',
                } : {}}>{index == 0 ? `${label}` : ''}</ThLeft>
                <TdRight width={15} style={{
                    borderTopWidth: index == 0 ? 1 : 0,
                    paddingTop: index == 0 ? 3 : 0,
                    borderBottomWidth: index == totals.length-1 ? 1 : 0,
                    paddingBottom: index == totals.length-1 ? 3 : 0,
                }}>
                    {toFormatted(money.amount, money.currency)} {money.currency}
                </TdRight>
            </Tr>
        })}
    </View>
}

function Totals({label, totals, width = 100}: TotalsProps) {
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
                <TdRight width={15} style={{
                    borderTopWidth: index == 0 ? 2 : 0,
                    paddingTop: index == 0 ? 3 : 0,
                    borderBottomWidth: index == totals.length-1 ? 2 : 0,
                    paddingBottom: index == totals.length-1 ? 3 : 0,
                }}>
                    {toFormatted(money.amount, money.currency)} {money.currency}
                </TdRight>
            </Tr>
        })}
    </View>
}
