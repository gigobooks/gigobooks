import { Base, Model } from './Base'
import { Entry } from './Entry'

export enum TransactionType {
    Contribution = 'contribution',
    Dividend = 'dividend',
}

export class Transaction extends Base {
    static Contribution = TransactionType.Contribution
    static Dividend = TransactionType.Dividend

    id?: number
    description?: string
    type?: TransactionType
    date?: Date

    static tableName = 'txn'
    static relationMappings = {
        entries: {
            relation: Model.HasManyRelation,
            modelClass: Entry,
            join: {
                from: 'txn.id',
                to: 'txn_entry.transactionId'
            }
        }
    }
}
