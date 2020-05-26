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
    taxCode?: string
    parentId?: number
    useGross?: number
    grossAmount?: number
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

    // If taxCode != '' && parentId != 0, this element is a tax component of the
    // parent element denoted by parentId
    taxCode?: string
    parentId?: number

    // If gross != 0, then the user entered a gross amount instead of a net-tax amount
    useGross?: number
    grossAmount?: number

    static tableName = 'txnElement'
    static get relationMappings() {
        return {
            transaction: {
                relation: Model.BelongsToOneRelation,
                modelClass: Transaction,
                join: {
                    from: 'txnElement.transactionId',
                    to: 'txn.id'
                }
            },
            settles: {
                relation: Model.BelongsToOneRelation,
                modelClass: Transaction,
                join: {
                    from: 'txnElement.settleId',
                    to: 'txn.id'
                }
            }
        }
    }
}
