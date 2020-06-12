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
    GrossExpense = 'gross-expense',
    InterestExpense = 'interest-expense',
    TaxExpense = 'tax-expense',
    DepreciationExpense = 'depreciation-expense',
    Gain = 'gain',
    Loss = 'loss',
}

// Account types whose account Id's start with the same digit
const AccountTypeGroupInfo: any = {
    [AccountType.Asset]: {
        label: 'Asset',
        types: [AccountType.Asset, AccountType.LongTermAsset],
        prefix: 1,
    },
    [AccountType.Liability]: {
        label: 'Liability',
        types: [AccountType.Liability, AccountType.LongTermLiability],
        prefix: 2,
    },
    [AccountType.Equity]: {
        label: 'Equity',
        types: [AccountType.Equity],
        prefix: 3,
    },
    [AccountType.Revenue]: {
        label: 'Revenue',
        types: [AccountType.Revenue, AccountType.Gain],
        prefix: 4,
    },
    [AccountType.Expense]: {
        label: 'Expense',
        types: [AccountType.Expense, AccountType.GrossExpense,
            AccountType.InterestExpense, AccountType.TaxExpense,
            AccountType.DepreciationExpense, AccountType.Loss],
        prefix: 5,
    },
}

export const AccountTypeInfo: Record<string, any> = {
    [AccountType.Asset]: { label: 'Asset', group: AccountType.Asset },
    [AccountType.LongTermAsset]: { label: 'Long term asset', group: AccountType.Asset,
        description: 'A long term (more than 12 months) asset' },
    [AccountType.Liability]: { label: 'Liability', group: AccountType.Liability },
    [AccountType.LongTermLiability]: { label: 'Long term liability', group: AccountType.Liability,
        description: 'A long term (more than 12 months) liability' },
    [AccountType.Equity]: { label: 'Equity', group: AccountType.Equity },
    [AccountType.Revenue]: { label: 'Revenue', group: AccountType.Revenue },
    [AccountType.Expense]: { label: 'Expense', group: AccountType.Expense },
    [AccountType.GrossExpense]: { label: 'Gross expense', group: AccountType.Expense },
    [AccountType.InterestExpense]: { label: 'Interest expense', group: AccountType.Expense },
    [AccountType.TaxExpense]: { label: 'Income tax expense', group: AccountType.Expense },
    [AccountType.DepreciationExpense]: { label: 'Depreciation expense', group: AccountType.Expense },
    [AccountType.Gain]: { label: 'Gain', group: AccountType.Revenue,
        description: 'A one-off gain from the sale or disposal of an asset' },
    [AccountType.Loss]: { label: 'Loss', group: AccountType.Expense,
        description: 'A one-off loss from the sale or disposal of an asset' },
}

const DebitTypes: any = [
    AccountType.Asset, AccountType.LongTermAsset,
    AccountType.Expense, AccountType.GrossExpense, AccountType.InterestExpense, 
    AccountType.TaxExpense, AccountType.DepreciationExpense, 
    // Apparently dividends are debit balance too,
    // but dividend isn't an account type. Huh ??
]

// Any account with id strictly less than 100 is a reserved/inbuilt/system account.
// These accounts are needed for higher level functionality to work.
// These accounts should never be changed/renamed.
const RESERVED_ACCOUNT_ID_MAX = 99

// A list of inbuilt accounts needed for (other) functionality
const ReservedAccountIds = {
    Cash: 10,
    AccountsReceivable: 11,
    TaxReceivable: 13,
    AccountsPayable: 20,
    TaxPayable: 22,
    Equity: 30,
}

export const PrepopulatedAccounts = [
    // Reserved and possible future reserved accounts
    {id: ReservedAccountIds.Cash, title: 'Cash', type: 'asset'},
    {id: ReservedAccountIds.AccountsReceivable, title: 'Accounts Receivable', type: 'asset'},
    {id: 12, title: 'Long Term Assets', type: 'long-term-asset'},
    {id: ReservedAccountIds.TaxReceivable, title: 'Tax Receivable', type: 'asset'},
    {id: ReservedAccountIds.AccountsPayable, title: 'Accounts Payable', type: 'liability'},
    {id: 21, title: 'Long Term Liabilities', type: 'long-term-liability'},
    {id: ReservedAccountIds.TaxPayable, title: 'Tax Payable', type: 'liability'},
    {id: ReservedAccountIds.Equity, title: 'Equity', type: 'equity'},
    {id: 50, title: 'Cost of Goods Sold', type: 'gross-expense'},
    {id: 51, title: 'Interest Expense', type: 'interest-expense'},
    {id: 52, title: 'Income Tax Expense', type: 'tax-expense'},
    {id: 53, title: 'Depreciation Expense', type: 'depreciation-expense'},

    // Unreserved accounts
    {id: 200, title: 'Credit Card', type: 'liability'},
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
]

export class Account extends Base {
    static Asset = AccountType.Asset
    static LongTermAsset = AccountType.LongTermAsset
    static Liability = AccountType.Liability
    static LongTermLiability = AccountType.LongTermLiability
    static Equity = AccountType.Equity
    static Revenue = AccountType.Revenue
    static Expense = AccountType.Expense
    static GrossExpense = AccountType.GrossExpense
    static InterestExpense = AccountType.InterestExpense
    static TaxExpense = AccountType.TaxExpense
    static DepreciationExpense = AccountType.DepreciationExpense
    static Gain = AccountType.Gain
    static Loss = AccountType.Loss

    static TypeInfo = AccountTypeInfo
    static TypeGroupInfo = AccountTypeGroupInfo
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

    get typeGroup() {
        return AccountTypeInfo[this.type!].group
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
            if (this.isReserved) {
                return Promise.reject('Cannot modify a reserved account.')
            }
            else {
                return Account.query(trx).patch(this).where('id', this.id)
            }
        }
    }

    // An insert which pre-computes `id`. Must be done in a transaction
    async _insert(trx: TransactionOrKnex) {
        const groupInfo = AccountTypeGroupInfo[this.typeGroup]
        const highest: Account[] = await Account.query(trx)
            .select('id')
            .whereIn('type', groupInfo.types)
            .orderBy('id', 'desc')
            .limit(1)
        const floor: number = highest.length > 0 ? highest[0].id! : 0
        this.id = prefixPreservingIncrement(
            Math.max(floor, RESERVED_ACCOUNT_ID_MAX), groupInfo.prefix)
        return Account.query(trx).insert(this)
    }
}

export default Account
