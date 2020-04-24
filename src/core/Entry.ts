import { Base, Model } from './Base'
import { Transaction } from './Transaction'

export class Entry extends Base {
    id?: number
    transactionId?: number
    description?: string
    accountId?: number
    // drcr == 1 means it's a debit, -1 means it's a credit
    drcr?: number
    amount?: number

    static tableName = 'txn_entry'
    static relationMappings = {
        transaction: {
            relation: Model.BelongsToOneRelation,
            modelClass: Transaction,
            join: {
                from: 'txn_entry.transaction_id',
                to: 'txn.transaction_id'
            }
        }
    }
}
