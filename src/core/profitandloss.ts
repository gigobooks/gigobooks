/**
 * Copyright (c) 2020-present Beng Tan
 */

import { Money, addSubtractMoney } from './currency'
import { Account, AccountType } from './Account'
import { Element } from './Element'
import { Transaction, TransactionType } from './Transaction'

type Item = {
    // parent transaction
    txnId: number
    txnType: TransactionType
    txnDate: string
    txnDescription: string

    // customer / supplier
    actorId: number
    actorTitle: string

    // revenue / expense account
    accountId: number
    accountTitle: string
    accountType: AccountType

    // balancing/opposing account ie. 'cash' or accounts receivable/payable
    // Is there a better name for this?
    // splitId: string
    // splitTitle: string

    // other fields
    id: number
    description: string
    amount: number
    currency: string
}

type Group = {
    accountId: number
    accountTitle: string
    items: Item[]
    totals: Money[]
}

type Normality = {
    type: 'ordinary' | 'abnormal' | 'extraordinary'
    revenues: {
        groups: Group[]
        totals: Money[]
    },
    expenses: {
        groups: Group[]
        totals: Money[]
    }
    netTotals: Money[]
}

type ProfitAndLoss = {
    startDate: string
    endDate: string
    divisions: Normality[]
    netTotals: Money[]
}

export { Item, Money, Account, Normality, ProfitAndLoss }

// ToDo: accural vs cash accounting
export async function profitAndLoss(startDate: string, endDate: string, accrual?: boolean) : Promise<ProfitAndLoss> {
    const elements = await Element.query()
        .leftJoin('txn', 'txnElement.transactionId', 'txn.id')
        .leftJoin('account', 'txnElement.accountId', 'account.id')
        .leftJoin('actor', 'txn.actorId', 'actor.id')
        .select('txnElement.*',
            'txn.id as txnId', 'txn.type as txnType', 'txn.date as txnDate', 'txn.description as txnDescription',
            'actor.Id as actorId', 'actor.title as actorTitle',
            'account.Id as accountId', 'account.title as accountTitle', 'account.type as accountType')
            // splitId, splitTitle ??
        .whereIn('account.type', [
            ...Account.TypeGroupInfo[Account.Revenue].types, 
            ...Account.TypeGroupInfo[Account.Expense].types
        ])
        .where('txn.date', '>=', startDate).where('txn.date', '<=', endDate)
        .orderBy([{column: 'txn.date', order: 'asc'}, {column: 'txn.id', order: 'asc'}])

    const rMap: Record<number, Group> = {}
    const eMap: Record<number, Group> = {}
    elements.forEach(element => {
        const item: Item = element as any
        if (Account.TypeGroupInfo[Account.Revenue].types.includes(item.accountType)) {
            if (!rMap[item.accountId]) {
                rMap[item.accountId] = {
                    accountId: item.accountId,
                    accountTitle: item.accountTitle,
                    items: [],
                    totals: []
                }
            }
            rMap[item.accountId].items.push(item)
        }
        else if (Account.TypeGroupInfo[Account.Expense].types.includes(item.accountType)) {
            if (!eMap[item.accountId]) {
                eMap[item.accountId] = {
                    accountId: item.accountId,
                    accountTitle: item.accountTitle,
                    items: [],
                    totals: []
                }
            }
            eMap[item.accountId].items.push(item)
        }
    })

    const rGroups: Group[] = []
    Object.keys(rMap).forEach((k: any) => {
        rMap[k].totals = Transaction.getSums(rMap[k].items)
        rGroups.push(rMap[k])
    })
    rGroups.sort((a, b) => { return a.accountTitle < b.accountTitle ? -1 : 1 })

    const rTotals: Money[] = rGroups.reduce((acc: Money[], cur: Group) => {
        return addSubtractMoney([...acc, ...cur.totals])
    }, [])

    const eGroups: Group[] = []
    Object.keys(eMap).forEach((k: any) => {
        eMap[k].totals = Transaction.getSums(eMap[k].items)
        eGroups.push(eMap[k])
    })
    eGroups.sort((a, b) => { return a.accountTitle < b.accountTitle ? -1 : 1 })

    const eTotals: Money[] = eGroups.reduce((acc: Money[], cur: Group) => {
        return addSubtractMoney([...acc, ...cur.totals])
    }, [])

    const nTotals = addSubtractMoney(rTotals, eTotals)
    return {
        startDate,
        endDate,
        divisions: [{
            type: 'ordinary',
            revenues: {
                groups: rGroups,
                totals: rTotals,
            },
            expenses: {
                groups: eGroups,
                totals: eTotals,
            },
            netTotals: nTotals,
        }],
        netTotals: nTotals,
    }
}
