/**
 * Copyright (c) 2020-present Beng Tan
 */

import { CurrencyConvertable, convertCurrency, exchangeRates, Money, addSubtractMoney } from './currency'
import { Account } from './Account'
import { Element } from './Element'
import { Transaction } from './Transaction'
import { Project } from './Project'
import { Item } from './profitandloss'
import { orderByField } from '../util/util'

type Group = {
    accountId: number
    accountTitle: string
    openingBalance: Money[]
    items: Item[]
    closingBalance: Money[]
}

type Division = {
    current: {
        groups: Group[]
        totals: Money[]
    },
    nonCurrent: {
        groups: Group[]
        totals: Money[]
    },
    totals: Money[]
}

export type BalanceSheet = {
    startDate: string
    endDate: string
    exchangeRates: Record<string, Record<string, string>>
    assets: Division
    liabilities: Division
    equity: {
        accounts: {
            groups: Group[]
            totals: Money[]
        },
    }
    netAssets: Money[]
}

export async function balanceSheet(startDate: string, endDate: string, currency?: string) : Promise<BalanceSheet> {
    const money0 = {currency: Project.variables.get('currency'), amount: 0}
    const reAccount: Account = await Account.query().findById(Account.Reserved.RetainedEarnings)
    const elements = await Element.query()
        .leftJoin('txn', 'txnElement.transactionId', 'txn.id')
        .leftJoin('account', 'txnElement.accountId', 'account.id')
        .leftJoin('actor', 'txn.actorId', 'actor.id')
        .select('txnElement.*',
            'txn.id as txnId', 'txn.type as txnType', 'txn.date as txnDate', 'txn.description as txnDescription',
            'actor.Id as actorId', 'actor.title as actorTitle',
            'account.Id as accountId', 'account.title as accountTitle', 'account.type as accountType')
        .where('txn.date', '<=', endDate)
        .orderBy([{column: 'txn.date', order: 'asc'}, {column: 'txn.id', order: 'asc'}])

    const result: any = {
        startDate,
        endDate,
        exchangeRates: {},
        assets: { current: {groups: [], totals: []}, nonCurrent: {groups: [], totals: []}, totals: [] },
        liabilities: { current: {groups: [], totals: []}, nonCurrent: {groups: [], totals: []}, totals: [] },
        equity: { accounts: {groups: [], totals: []} },
        netAssets: []
    } as BalanceSheet

    const items: {
        assets: { current: Record<number, Group>, nonCurrent: Record<number, Group> }
        liabilities: { current: Record<number, Group>, nonCurrent: Record<number, Group> }
        equity: { accounts: Record<number, Group> }
    } = {
        assets: { current: {}, nonCurrent: {} },
        liabilities: { current: {}, nonCurrent: {} },
        equity: { accounts: {} },
    }

    // Retained Earnings needs special treatment
    const netProfitItems: Item[] = []
    const prevNetProfitItems: Item[] = []
    ;(items.equity.accounts)[reAccount.id!] = {
        accountId: reAccount.id!,
        accountTitle: reAccount.title!,
        openingBalance: [money0],
        items: [],
        closingBalance: []
    }

    function pushItem(map: Record<number, Group>, item: Item) {
        if (!map[item.accountId]) {
            map[item.accountId] = {
                accountId: item.accountId,
                accountTitle: item.accountTitle,
                openingBalance: [money0],
                items: [],
                closingBalance: []
            }    
        }

        if (item.txnDate < startDate) {
            // Before startDate: This item is part of the calculation of opening
            // balance but doesn't appear in the log
            const getBalances = Account.isDebitBalanceType(item.accountType) ? Transaction.getDebitBalances : Transaction.getCreditBalances
            map[item.accountId].openingBalance = addSubtractMoney([
                ...map[item.accountId].openingBalance,
                ...getBalances([item])
            ])
        }
        else {
            map[item.accountId].items.push(item)
        }
    }

    // Maybe convert currency
    if (currency) {
        elements.forEach(element => {
            convertCurrency(element as CurrencyConvertable, currency)
        })

        result.exchangeRates = exchangeRates()
    }

    elements.forEach(element => {
        const item: Item = element as any
        if (item.accountType == Account.LongTermAsset) {
            pushItem(items.assets.nonCurrent, item)
        }
        else if (Account.TypeGroupInfo[Account.Asset].types.includes(item.accountType)) {
            pushItem(items.assets.current, item)
        }
        else if (item.accountType == Account.LongTermLiability) {
            pushItem(items.liabilities.nonCurrent, item)
        }
        else if (Account.TypeGroupInfo[Account.Liability].types.includes(item.accountType)) {
            pushItem(items.liabilities.current, item)
        }
        else if (Account.TypeGroupInfo[Account.Equity].types.includes(item.accountType)) {
            pushItem(items.equity.accounts, item)
        }
        else {
            // Revenue and expense: Store and process them differently
            // These are used to compute net profit values which then feed into Retained Earnings
            ;(item.txnDate < startDate ? prevNetProfitItems : netProfitItems).push(item)
        }
    })

    // Handle Retained Earnings
    // * Incorporate historical profit into opening balance
    // * Inject a 'net profit' item (for each currency)
    const reGroup = (items.equity.accounts)[reAccount.id!]
    reGroup.openingBalance = addSubtractMoney([
        ...reGroup.openingBalance,
        ...Transaction.getCreditBalances(prevNetProfitItems),
    ])
    Transaction.getCreditBalances(netProfitItems).forEach((m: Money, index) => {
        reGroup.items.push({
            txnId: 'Net Profit' as any,     // !! Hack
            txnDescription: m.currency,
            accountId: reAccount.id,
            accountTitle: reAccount.title,
            accountType: reAccount.type,
            id: -index,     // Just need a unique number
            drcr: Element.Credit,
            amount: m.amount,
            currency: m.currency,
        } as Item)
    })

    ;[['assets', 'current'], ['assets', 'nonCurrent'],
      ['liabilities', 'current'], ['liabilities', 'nonCurrent'],
      ['equity', 'accounts']].forEach(([division, subdivision]) => {
        const getBalances = division == 'assets' ? Transaction.getDebitBalances : Transaction.getCreditBalances
        const sub = result[division][subdivision]

        Object.keys((items as any)[division][subdivision]).forEach((accountId: any) => {
            const group = (items as any)[division][subdivision][accountId]
            group.closingBalance = addSubtractMoney([
                ...group.openingBalance,
                ...getBalances(group.items)
            ])

            sub.groups.push(group)
            sub.totals = sub.groups.reduce((acc: Money[], cur: Group) => {
                return addSubtractMoney([...acc, ...cur.closingBalance])
            }, [])
        })

        sub.groups.sort(orderByField('accountTitle'))
    })

    result.assets.totals = addSubtractMoney([
        ...result.assets.current.totals,
        ...result.assets.nonCurrent.totals,
    ])
    result.liabilities.totals = addSubtractMoney([
        ...result.liabilities.current.totals,
        ...result.liabilities.nonCurrent.totals,
    ])
    result.netAssets = addSubtractMoney(result.assets.totals, result.liabilities.totals)
    return result
}
