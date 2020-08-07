/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, Table, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Transaction, TransactionType, formatDateOnly, toFormattedAbs,
    ProfitAndLoss, profitAndLoss, datePresetDates } from '../core'
import { DateRange, ReportHeader } from './Reports'

function transactionTypeLabel(type: TransactionType) {
    // Abbreviate some long labels
    return type == Transaction.Sale ? 'Sale' :
        type == Transaction.Purchase ? 'Purchase' :
        Transaction.TypeInfo[type].label
}

export function ProfitAndLossDetail() {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [info, setInfo] = React.useState<ProfitAndLoss>()

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
            profitAndLoss(startDate, endDate).then(data => {
                setInfo(data)
            })
        }
    }, [startDate, endDate])

    return <div>
        <h1><span className='title'>Profit and Loss: Detail</span></h1>
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

        {info && <PDFView><Document><Page size="A4" style={[Styles.page, {fontSize: 9}]}>
            <ReportHeader startDate={startDate} endDate={endDate} title='Profit and Loss: Detail' />
            <Table>
                <Tr key='header' style={{marginBottom: 6}}>
                    <ThLeft width={15} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                    <ThLeft width={10} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                    <ThLeft width={20} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                    <Th width={40} innerStyle={{borderBottomWidth: 1}}>Description</Th>
                    <ThRight width={15} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
                </Tr>

                <View key='revenue' style={{marginBottom: 12}}>
                    <Tr>
                        <Th>Revenue</Th>
                    </Tr>

                    {info.divisions[0].revenues.groups.map(group => <View key={`group-${group.accountId}`}>
                    <Tr>
                        <Th key='group-header' indent={2}>{group.accountTitle}</Th>
                    </Tr>
                    {group.items.map((item, index) => {
                        return <Tr key={item.id}>
                            <TdLeft width={13} indent={2}>{transactionTypeLabel(item.txnType)} {item.txnId}</TdLeft>
                            <Td width={10} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                            <TdLeft width={20}>{item.actorTitle}</TdLeft>
                            <Td width={40}>{
                                !item.txnDescription ? item.description :
                                !item.description ? item.txnDescription :
                                `${item.txnDescription}: ${item.description}`
                            }</Td>
                            <TdRight width={15} style={index == group.items.length - 1 ? {
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
                            <TdLeft width={83} indent={2}>
                                {index == 0 ? `Total ${group.accountTitle}` : ''}
                            </TdLeft>
                            <TdRight width={15}>
                                {toFormattedAbs(money.amount, money.currency)} {money.currency}
                            </TdRight>
                        </Tr>    
                    })}
                    </View>)}

                    {info.divisions[0].revenues.totals.map((money, index) => {
                        return <Tr key={money.currency}>
                            <ThLeft width={85} style={index == 0 ? {
                                paddingTop: 3,
                                borderTopWidth: 1,
                                borderColor: '#fff', // transparent
                            } : {}}>{index == 0 ? 'Total Revenue' : ''}</ThLeft>
                            <ThRight width={15} style={index == 0 ? {
                                paddingTop: 3,
                                borderTopWidth: 1,
                            } : {}}>
                                {toFormattedAbs(money.amount, money.currency)} {money.currency}
                            </ThRight>
                        </Tr>
                    })}
                </View>

                <View key='expenses' style={{marginBottom: 12}}>
                    <Tr>
                        <Th>Expenses</Th>
                    </Tr>

                    {info.divisions[0].expenses.groups.map(group => <View key={`group-${group.accountId}`}>
                    <Tr>
                        <Th key='group-header' indent={2}>{group.accountTitle}</Th>
                    </Tr>
                    {group.items.map((item, index) => {
                        return <Tr key={item.id}>
                            <TdLeft width={13} indent={2}>{transactionTypeLabel(item.txnType)} {item.txnId}</TdLeft>
                            <Td width={10} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                            <TdLeft width={20}>{item.actorTitle}</TdLeft>
                            <Td width={40}>{
                                !item.txnDescription ? item.description :
                                !item.description ? item.txnDescription :
                                `${item.txnDescription}: ${item.description}`
                            }</Td>
                            <TdRight width={15} style={index == group.items.length - 1 ? {
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
                            <TdLeft width={83} indent={2}>
                                {index == 0 ? `Total ${group.accountTitle}` : ''}
                            </TdLeft>
                            <TdRight width={15}>
                                {toFormattedAbs(money.amount, money.currency)} {money.currency}
                            </TdRight>
                        </Tr>    
                    })}
                    </View>)}

                    {info.divisions[0].expenses.totals.map((money, index) => {
                        return <Tr key={money.currency}>
                            <ThLeft width={85} style={index == 0 ? {
                                paddingTop: 3,
                                borderTopWidth: 1,
                                borderColor: '#fff', // transparent
                            } : {}}>{index == 0 ? 'Total Expenses' : ''}</ThLeft>
                            <ThRight width={15} style={index == 0 ? {
                                paddingTop: 3,
                                borderTopWidth: 1,
                            } : {}}>
                                {toFormattedAbs(money.amount, money.currency)} {money.currency}
                            </ThRight>
                        </Tr>
                    })}
                </View>

                <View>
                    {info.divisions[0].netTotals.map((money, index) => {
                        return <Tr key={`${money.currency}`}>
                            <ThLeft width={85} style={index == 0 ? {
                                paddingTop: 3,
                                borderTopWidth: 2,
                                borderColor: '#fff', // transparent
                            } : {}}>{index == 0 ? `Net Revenue` : ''}</ThLeft>
                            <ThRight width={15} style={{
                                borderTopWidth: index == 0 ? 2 : 0,
                                paddingTop: index == 0 ? 3 : 0,
                                borderBottomWidth: index == info.divisions[0].netTotals.length-1 ? 2 : 0,
                                paddingBottom: index == info.divisions[0].netTotals.length-1 ? 3 : 0,
                            }}>
                                {toFormattedAbs(money.amount, money.currency)} {money.currency}
                            </ThRight>
                        </Tr>})}
                </View>
            </Table>
        </Page></Document></PDFView>}
    </div>
}
