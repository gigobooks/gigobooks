import { Model } from 'objection'

export enum AccountType {
    Asset = "asset",
    Liability = "liability",
    Equity = "equity",
    Revenue = "revenue",
    Expense = "expense",
}

interface AccountFields {
    id?: number,
    title: string,
    type: AccountType,
    updatedAt?: Date,
    createdAt?: Date,
}

export class Account extends Model {
    // Object variables must all be optional since there is no constructor
    id?: number
    title?: string
    type?: AccountType
    updatedAt?: Date
    createdAt?: Date

    // Model subclasses can't have constructors which take arguments
    // This is a substitute
    static construct(fields: AccountFields): Account {
        const obj = new Account()
        Object.assign(obj, fields)

        if (obj.createdAt == undefined) {
            obj.createdAt = new Date()
        }
        if (obj.updatedAt == undefined) {
            obj.updatedAt = obj.createdAt
        }
        return obj
    }

    static tableName = 'account'
}

export default Account
