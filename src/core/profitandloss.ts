/**
 * Copyright (c) 2020-present Beng Tan
 */

import { Money, addSubtractMoney } from './currency'
import { Account, AccountType } from './Account'
import { Element } from './Element'
import { Transaction, TransactionType } from './Transaction'
import { Project } from './Project'
import { orderByField } from '../util/util'

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
    drcr: number
    amount: number
    currency: string
}

type Group = {
    accountId: number
    accountTitle: string
    items: Item[]
    totals: Money[]
}

type Division = {
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
    hasOperations: boolean
    operations: Division
    hasDepreciation: boolean
    depreciation: Division
    hasInterestTax: boolean
    interestTax: Division
    ebitda: Money[]
    ebit: Money[]
    netProfit: Money[]
}

export { Item, Money, Account, Division, ProfitAndLoss }

// ToDo: accrual vs cash accounting ??
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

    const result: any = {
        startDate,
        endDate,
        hasOperations: false,
        operations: { revenues: {groups: [], totals: []}, expenses: {groups: [], totals: []}, netTotals: []},
        hasDepreciation: false,
        depreciation: { revenues: {groups: [], totals: []}, expenses: {groups: [], totals: []}, netTotals: []},
        hasInterestTax: false,
        interestTax: { revenues: {groups: [], totals: []}, expenses: {groups: [], totals: []}, netTotals: []},
        ebitda: [],
        ebit: [],
        netProfit: [],
    } as ProfitAndLoss

    const items: {
        operations: { revenues: Record<number, Group>, expenses: Record<number, Group> }
        depreciation: { revenues: Record<number, Group>, expenses: Record<number, Group> }
        interestTax: { revenues: Record<number, Group>, expenses: Record<number, Group> }
    } = {
        operations: { revenues: {}, expenses: {} },
        depreciation: { revenues: {}, expenses: {} },
        interestTax: { revenues: {}, expenses: {} },
    }

    function pushItem(map: Record<number, Group>, item: Item) {
        if (!map[item.accountId]) {
            map[item.accountId] = {
                accountId: item.accountId,
                accountTitle: item.accountTitle,
                items: [],
                totals: []
            }    
        }
        map[item.accountId].items.push(item)
    }

    // Allocate items to buckets
    elements.forEach(element => {
        const item: Item = element as any
        if (Account.TypeGroupInfo[Account.Revenue].types.includes(item.accountType)) {
            pushItem(items.operations.revenues, item)
            result.hasOperations = true
        }
        else if (item.accountType == Account.DepreciationExpense) {
            pushItem(items.depreciation.expenses, item)
            result.hasDepreciation = true
        }
        else if (item.accountType == Account.InterestExpense || item.accountType == Account.TaxExpense) {
            pushItem(items.interestTax.expenses, item)
            result.hasInterestTax = true
        }
        else if (Account.TypeGroupInfo[Account.Expense].types.includes(item.accountType)) {
            pushItem(items.operations.expenses, item)
            result.hasOperations = true
        }
    })

    ;['operations', 'depreciation', 'interestTax'].forEach(division => {
        ;['revenues', 'expenses'].forEach(half => {
            const halfdivision = result[division][half]
            Object.keys((items as any)[division][half]).forEach((accountId: any) => {
                const group = (items as any)[division][half][accountId]
                group.totals = half == 'revenues' ? Transaction.getCreditBalances(group.items) : Transaction.getDebitBalances(group.items)

                halfdivision.groups.push(group)
                halfdivision.totals = halfdivision.groups.reduce((acc: Money[], cur: Group) => {
                    return addSubtractMoney([...acc, ...cur.totals])
                }, [])
            })

            halfdivision.groups.sort(orderByField('accountTitle'))
        })

        result[division].netTotals = addSubtractMoney(result[division].revenues.totals, result[division].expenses.totals)
    })

    const money0 = {currency: Project.variables.get('currency'), amount: 0}
    result.ebitda = addSubtractMoney([money0, ...result.operations.netTotals])
    result.ebit = addSubtractMoney([...result.ebitda, ...result.depreciation.netTotals])
    result.netProfit = addSubtractMoney([...result.ebit, ...result.interestTax.netTotals])

    return result
}
