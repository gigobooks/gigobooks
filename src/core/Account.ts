import { Base, TransactionOrKnex } from './Base'
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

const DebitTypes: any = [
    AccountType.Asset, AccountType.LongTermAsset,
    AccountType.Expense, AccountType.InterestExpense, 
    AccountType.TaxExpense, AccountType.DepreciationExpense, 
    // Apparently dividends are debit balance too,
    // but dividend isn't an account type. Huh ??
]

// Any account with id strictly less than 1000 is a reserved/inbuilt/system account.
// These accounts are needed for higher level functionality to work.
// These accounts should never be changed/renamed.
const RESERVED_ACCOUNT_ID_MAX = 999

// A list of inbuilt accounts needed for (other) functionality
const ReservedAccountIds = {
    Cash: 100,
    AccountsReceivable: 101,
    AccountsPayable: 200,
    Equity: 300,
}

export const PrepopulatedAccounts = [
    {id: ReservedAccountIds.Cash, title: 'Cash', type: 'asset'},
    {id: ReservedAccountIds.AccountsReceivable, title: 'Accounts Receivable', type: 'asset'},
    {id: 102, title: 'Long Term Assets', type: 'long-term-asset'},
    {id: ReservedAccountIds.AccountsPayable, title: 'Accounts Payable', type: 'liability'},
    {id: 201, title: 'Credit Card', type: 'liability'},
    {id: 202, title: 'Long Term Liabilities', type: 'long-term-liability'},
    {id: ReservedAccountIds.Equity, title: 'Equity', type: 'equity'},
    {id: 400, title: 'Consulting Revenue', type: 'revenue'},
    {id: 401, title: 'Project Revenue', type: 'revenue'},
    {id: 402, title: 'Recurring Revenue', type: 'revenue'},
    {id: 403, title: 'Reimbursed Expenses', type: 'revenue'},
    {id: 404, title: 'Other Revenue', type: 'revenue'},
    {id: 500, title: 'Bank and Financial Charges', type: 'expense'},
    {id: 501, title: 'Books and Publications', type: 'expense'},
    {id: 502, title: 'Expensed Equipment', type: 'expense'},
    {id: 503, title: 'Gifts and Docations', type: 'expense'},
    {id: 504, title: 'Insurance', type: 'expense'},
    {id: 505, title: 'Licenses and Permits', type: 'expense'},
    {id: 506, title: 'Miscellaneous and Other Expenses', type: 'expense'},
    {id: 507, title: 'Office Supplies', type: 'expense'},
    {id: 508, title: 'Professional Fees', type: 'expense'},
    {id: 509, title: 'Rent Expense', type: 'expense'},
    {id: 510, title: 'Subscriptions', type: 'expense'},
    {id: 511, title: 'Telecommunications', type: 'expense'},
    {id: 512, title: 'Travel and Entertainment', type: 'expense'},
    {id: 513, title: 'Utilities', type: 'expense'},
    {id: 514, title: 'Interest Expense', type: 'interest-expense'},
    {id: 515, title: 'Taxes', type: 'tax-expense'},
    {id: 516, title: 'Depreciation Expense', type: 'depreciation-expense'},
]

export class Account extends Base {
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

    static Reserved = ReservedAccountIds

    // Object variables must all be optional since there is no constructor to assign them
    id?: number
    title?: string
    type?: AccountType

    static tableName = 'account'

    get isReserved() {
        return this.id! <= RESERVED_ACCOUNT_ID_MAX
    }

    get isDebitBalance() {
        return DebitTypes.includes(this.type)
    }

    async save(trx?: TransactionOrKnex) {
        this.updatedAt = new Date()
        if (this.id == undefined) {
            if (trx) {
                // Use the supplied transaction
                return this._insert(trx)
            }
            else {
                // Wrap with our own transaction
                return Base.transaction(async trx => {
                    return this._insert(trx)
                })    
            }
        }
        else {
            return Account.query(trx).patch(this).where('id', this.id)
        }
    }

    // An insert which pre-computes `id`. Must be done in a transaction
    async _insert(trx: TransactionOrKnex) {
        const typeInfo = AccountTypeInfo[this.type!]
        const highest: Account[] = await Account.query(trx)
            .select('id')
            .whereIn('type', typeInfo.prefixGroup)
            .orderBy('id', 'desc')
            .limit(1)
        const floor: number = highest.length > 0 ? highest[0].id! : 0
        this.id = prefixPreservingIncrement(
            Math.max(floor, RESERVED_ACCOUNT_ID_MAX), typeInfo.prefix)
        return Account.query(trx).insert(this)
    }
}

export default Account
