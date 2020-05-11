import { Base, Model } from './Base'
import { Transaction } from './Transaction'

export interface IElement {
    id?: number
    transactionId?: number
    description?: string
    accountId?: number
    drcr?: number
    amount?: number        
    currency?: string
    settleId?: number
}

export class Element extends Base {
    static Debit = 1
    static Credit = -1

    id?: number
    transactionId?: number
    description?: string
    accountId?: number
    // drcr == 1 means it's a debit, -1 means it's a credit
    drcr?: number
    amount?: number
    currency?: string
    // The id of a transaction that is (partly or completely) settled by this element
    settleId?: number

    static tableName = 'txn_element'
    static relationMappings = {
        transaction: {
            relation: Model.BelongsToOneRelation,
            modelClass: Transaction,
            join: {
                from: 'txn_element.transaction_id',
                to: 'txn.transaction_id'
            }
        }
    }
}
