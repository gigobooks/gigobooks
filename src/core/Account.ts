import { Model } from 'objection'

export enum AccountType {
    Asset = 'asset',
    LongTermAsset = 'long-term-asset',
    Liability = 'liability',
    LongTermLiability = 'long-term-liability',
    Equity = 'equity',
    Revenue = 'revenue',
    Expense = 'expense',
    InterestExpense = 'interest-expense',
    TaxExpense = 'tax-expense',
    DepreciationExpense = 'depreciation-expense',
    Gain = 'gain',
    Loss = 'loss',
}

export const AccountTypeInfo = {
    'asset': { label: 'asset' },
    'long-term-asset': { label: 'long term asset',
        description: 'A long term (more than 12 months) asset' },
    'liability': { label: 'liability' },
    'long-term-liability': { label: 'long term liability',
        description: 'A long term (more than 12 months) liability' },
    'equity': { label: 'equity' },
    'revenue': { label: 'revenue' },
    'expense': { label: 'expense' },
    'interest-expense': { label: 'interest expense' },
    'tax-expense': { label: 'tax expense' },
    'depreciation-expense': { label: 'depreciation expense' },
    'gain': { label: 'gain',
        description: 'A one-off gain from the sale or disposal of an asset' },
    'loss': { label: 'loss',
        description: 'A one-off loss from the sale or disposal of an asset' },
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
    static LongTermAsset = AccountType.LongTermAsset
    static Liability = AccountType.Liability
    static LongTermLiability = AccountType.LongTermLiability
    static Equity = AccountType.Equity
    static Revenue = AccountType.Revenue
    static Expense = AccountType.Expense
    static InterestExpense = AccountType.InterestExpense
    static TaxExpense = AccountType.TaxExpense
    static DepreciationExpense = AccountType.DepreciationExpense
    static Gain = AccountType.Gain
    static Loss = AccountType.Loss

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
    static get useLimitInFirst() { return true }

    async save() {
        this.updatedAt = new Date()
        return this.id === undefined ? Account.query().insert(this)
            : Account.query().update(this)
    }
}

export default Account
