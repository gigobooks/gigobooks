import { Model } from 'objection'

enum AccountType {
    Asset = "asset",
    Liability = "liability",
    Equity = "equity",
    Revenue = "revenue",
    Expense = "expense",
}

export interface AccountFields {
    id?: number,
    title: string,
    type: AccountType,
    updatedAt?: Date,
    createdAt?: Date,
}

export class Account extends Model {
    static Asset = AccountType.Asset
    static Liability = AccountType.Liability
    static Equity = AccountType.Equity
    static Revenue = AccountType.Revenue
    static Expense = AccountType.Expense

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

    async save() {
        this.updatedAt = new Date()
        return this.id === undefined ? Account.query().insert(this)
            : Account.query().update(this)
    }
}

export default Account
