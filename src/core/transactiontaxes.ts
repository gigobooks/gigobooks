/**
 * Copyright (c) 2020-present Beng Tan
 */

import { Money } from './currency'
import { TaxCodeInfo } from './tax'
import { Account, AccountType } from './Account'
import { Element } from './Element'
import { Transaction, TransactionType } from './Transaction'

export type TaxItem = {
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

    parentAmount: number
    parentDescription: string

    // other fields
    id: number
    description: string
    drcr: number
    amount: number
    currency: string
    taxCode: string

    // computed/derived fields
    taxInfo: TaxCodeInfo
}

export type TaxItemGroup = {
    items: TaxItem[]
    taxTotals: Money[]
    totals: Money[]
}

export async function taxItems(startDate: string, endDate: string, accrual: boolean, prefixes: string[] = []): Promise<TaxItem[]> {
    const paid: Transaction[] = []  // Sparse array, only for non-accrual
    const query = Element.query()
        .leftJoin('txn', 'txnElement.transactionId', 'txn.id')
        .leftJoin('account', 'txnElement.accountId', 'account.id')
        .leftJoin('actor', 'txn.actorId', 'actor.id')
        .leftJoin('txnElement as parent', 'txnElement.parentId', 'parent.id')
        .select('txnElement.*',
            'txn.id as txnId', 'txn.type as txnType', 'txn.date as txnDate', 'txn.description as txnDescription',
            'actor.Id as actorId', 'actor.title as actorTitle',
            'account.Id as accountId', 'account.title as accountTitle', 'account.type as accountType',
            'parent.amount as parentAmount', 'parent.description as parentDescription')

    if (accrual) {
        query.where('txn.date', '>=', startDate).where('txn.date', '<=', endDate)
    }
    else {
        // Cash accounting: Omit 'accrual-ish' transactions (ie. invoices, bills)
        // unless they were fully paid during the date range. Transactions which were
        // partly paid (but not fully paid) during the date range are not included.
        // In other words, partial payments don't count.
        //
        // The logic to do this is a bit crazy and probably too hard to do in SQL.
        // Instead, retrieve all transactions (and settling payments) which had a
        // payment within the date range. Then use application logic to filter.

        const candidates = await Transaction.query()
            .whereIn('type', [Transaction.Invoice, Transaction.Bill])
            .whereRaw('EXISTS (SELECT e.id FROM txn_element e LEFT JOIN txn t ON e.transaction_id = t.id WHERE settle_id = txn.id AND t.date >= ? AND t.date <= ?)', [startDate, endDate])
            .withGraphFetched('elements')
            .withGraphFetched('settledBy')

        // We want to extract transactions which are settled (ie. fully paid)
        // and the last/most-recent payment falls within the date range.
        candidates.forEach(_t => {
            const t: Transaction & { settledBy: Element[] } = _t as any
            const settlement: Element & { date: string } = t.settledBy[t.settledBy.length-1] as any

            if (settlement.date >= startDate && settlement.date <= endDate) {
                const allElements = [...t.elements!, ...t.settledBy]
                let balances: Money[]

                if (settlement.accountId == Account.Reserved.AccountsReceivable) {
                    balances = Transaction.getDebitBalances(allElements.filter(
                        e => e.accountId == Account.Reserved.AccountsReceivable))
                }
                else if (settlement.accountId == Account.Reserved.AccountsPayable) {
                    balances = Transaction.getCreditBalances(allElements.filter(
                        e => e.accountId == Account.Reserved.AccountsPayable))
                }

                if (balances!.every(b => { return b.amount <= 0 })) {
                    // Inject settlement date
                    t.date = settlement.date
                    paid[t.id!] = t
                }
            }
        })

        query.where(function() {
            this.where(function () {
                this.whereIn('txn.type', [Transaction.Invoice, Transaction.Bill])
                .whereIn('txn.id', Object.keys(paid))
            }).orWhere(function () {
                this.whereNotIn('txn.type', [Transaction.Invoice, Transaction.Bill])
                .where('txn.date', '>=', startDate).where('txn.date', '<=', endDate)
            })
        })
    }

    if (prefixes && prefixes.length > 0) {
        query.where(function () {
            prefixes.forEach(prefix => {
                this.orWhere('txnElement.taxCode', 'LIKE', `${prefix}%`)
            })
        })
    }
    else {
        query.where('txnElement.taxCode', '<>', '')
    }

    const elements: (Element & TaxItem)[] = await query as any

    if (!accrual) {
        // Inject settlement date
        elements.forEach(e => {
            if (paid[e.transactionId!]) {
                e.txnDate = paid[e.transactionId!].date!
            }
        })
    }

    elements.sort(function (a: TaxItem, b: TaxItem) {
        if (a.txnDate == b.txnDate) {
            return a.txnId < b.txnId ? -1 : 1
        }
        return a.txnDate < b.txnDate ? -1 : 1
    })
    elements.forEach(item => {
        item.taxInfo = new TaxCodeInfo(item.taxCode)        
    })
    return elements
}
