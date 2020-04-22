import { Model } from 'objection'
import { prefixPreservingIncrement } from '../util/util'

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

// Account types whose account Id's start with the same digit
const PrefixGroup: any = {
    'asset': ['asset', 'long-term-asset'],
    'liability': ['liability', 'long-term-liability'],
    'equity': ['equity'],
    'revenue': ['revenue', 'gain'],
    'expense': ['expense', 'interest-expense', 'tax-expense', 'depreciation-expense', 'loss']
}

export const AccountTypeInfo: any = {
    'asset': { label: 'Asset', prefix: 1, prefixGroup: PrefixGroup.asset },
    'long-term-asset': { label: 'Long term asset', prefix: 1, prefixGroup: PrefixGroup.asset,
        description: 'A long term (more than 12 months) asset' },
    'liability': { label: 'Liability', prefix: 2, prefixGroup: PrefixGroup.liability },
    'long-term-liability': { label: 'Long term liability', prefix: 2, prefixGroup: PrefixGroup.liability,
        description: 'A long term (more than 12 months) liability' },
    'equity': { label: 'Equity', prefix: 3, prefixGroup: PrefixGroup.equity },
    'revenue': { label: 'Revenue', prefix: 4, prefixGroup: PrefixGroup.revenue },
    'expense': { label: 'Expense', prefix: 5, prefixGroup: PrefixGroup.expense },
    'interest-expense': { label: 'Interest expense', prefix: 5, prefixGroup: PrefixGroup.expense },
    'tax-expense': { label: 'Tax expense', prefix: 5, prefixGroup: PrefixGroup.expense },
    'depreciation-expense': { label: 'Depreciation expense', prefix: 5, },
    'gain': { label: 'Gain', prefix: 4, prefixGroup: PrefixGroup.revenue,
        description: 'A one-off gain from the sale or disposal of an asset' },
    'loss': { label: 'Loss', prefix: 5, prefixGroup: PrefixGroup.expense,
        description: 'A one-off loss from the sale or disposal of an asset' },
}

export interface IAccount {
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
    static construct(fields: IAccount): Account {
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
        if (this.id == undefined) {
            return Model.transaction(async trx => {
                const typeInfo = AccountTypeInfo[this.type!]
                const highest: Account[] = await Account.query(trx)
                    .select('id')
                    .whereIn('type', typeInfo.prefixGroup)
                    .orderBy('id', 'desc')
                    .limit(1)
                const floor: number = highest.length > 0 ? highest[0].id! : 0
                this.id = prefixPreservingIncrement(floor, typeInfo.prefix)
                return Account.query(trx).insert(this)
            })
        }
        else {
            return Account.query().patch(this).where('id', this.id)
        }
    }
}

export default Account
