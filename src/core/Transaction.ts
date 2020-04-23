import { Base } from './Base'

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
    entries?: Entry[]

    static tableName = 'txn'
}

export class Entry extends Base {
    id?: number
    transactionId?: number
    description?: string
    accountId?: number
    debit?: number

    static tableName = 'txn_entry'
}

