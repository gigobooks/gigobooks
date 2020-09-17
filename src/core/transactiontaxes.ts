/**
 * Copyright (c) 2020-present Beng Tan
 */

import { Money } from './currency'
import { TaxCodeInfo, TaxAuthority, taxAuthorities } from './tax'
import { AccountType } from './Account'
import { Element } from './Element'
import { Transaction, TransactionType } from './Transaction'
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

    parentAmount: number
    parentDescription: string

    // other fields
    id: number
    description: string
    drcr: number
    amount: number
    currency: string
    taxCode: string

    taxInfo: TaxCodeInfo
}

type Group = {
    items: Item[]
    taxTotals: Money[]
    totals: Money[]
}

type Division = {
    authority: TaxAuthority
    id: string
    region: string
    outputs: Group
    inputs: Group
}

export type TransactionTaxes = {
    startDate: string
    endDate: string
    authorities: Division[]
}

export async function transactionTaxesDetail(startDate: string, endDate: string, accrual?: boolean) : Promise<TransactionTaxes> {
    const elements = await Element.query()
        .leftJoin('txn', 'txnElement.transactionId', 'txn.id')
        .leftJoin('account', 'txnElement.accountId', 'account.id')
        .leftJoin('actor', 'txn.actorId', 'actor.id')
        .leftJoin('txnElement as parent', 'txnElement.parentId', 'parent.id')
        .select('txnElement.*',
            'txn.id as txnId', 'txn.type as txnType', 'txn.date as txnDate', 'txn.description as txnDescription',
            'actor.Id as actorId', 'actor.title as actorTitle',
            'account.Id as accountId', 'account.title as accountTitle', 'account.type as accountType',
            'parent.amount as parentAmount', 'parent.description as parentDescription')
        .where('txnElement.taxCode', '<>', '')
        .where('txn.date', '>=', startDate).where('txn.date', '<=', endDate)
        .orderBy([{column: 'txn.date', order: 'asc'}, {column: 'txn.id', order: 'asc'}])

    const result: TransactionTaxes = {
        startDate,
        endDate,
        authorities: []
    }
    const authorities: Record<string, Division> = {}

    elements.forEach(element => {
        const item: Item = element as any
        item.taxInfo = new TaxCodeInfo(item.taxCode)

        if (!authorities[item.taxInfo.authority]) {
            authorities[item.taxInfo.authority] = {
                authority: taxAuthorities[item.taxInfo.authority],
                id: item.taxInfo.authority,
                region: taxAuthorities[item.taxInfo.authority].regionName,
                outputs: { items: [], taxTotals: [], totals: [] },
                inputs: { items: [], taxTotals: [], totals: [] },
            }
        }

        if (item.drcr == Transaction.Credit) {
            authorities[item.taxInfo.authority].outputs.items.push(item)
        }
        else {
            authorities[item.taxInfo.authority].inputs.items.push(item)
        }
    })

    result.authorities = Object.keys(authorities).map(k => authorities[k])
    result.authorities.sort(orderByField('region'))

    result.authorities.forEach(division => {
        division.outputs.taxTotals = Transaction.getSums(division.outputs.items)
        division.inputs.taxTotals = Transaction.getSums(division.inputs.items)

        division.outputs.totals = Transaction.getSums(division.outputs.items.map(item => {
            return {...item, amount: item.parentAmount}
        }))
        division.inputs.totals = Transaction.getSums(division.inputs.items.map(item => {
            return {...item, amount: item.parentAmount}
        }))
    })

    return result
}
