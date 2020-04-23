import Knex = require('knex');
import schema from './schema/schema0'

export default async function prepopulate(db: sqlite.Database, knex: Knex): Promise<void> {
    const now = new Date()
    for (let q of schema) {
        await db.exec(q)
    }

    await knex('variable').insert({
        name: 'magic', value: 'sunrise',  updatedAt: now, createdAt: now
    })

    const accounts = [
        { id: 100, title: 'Cash', type: 'asset', updatedAt: now, createdAt: now },
        { id: 101, title: 'Accounts Receivable', type: 'asset', updatedAt: now, createdAt: now },
        { id: 102, title: 'Long Term Assets', type: 'long-term-asset', updatedAt: now, createdAt: now },
        { id: 200, title: 'Accounts Payable', type: 'liability', updatedAt: now, createdAt: now },
        { id: 201, title: 'Credit Card', type: 'liability', updatedAt: now, createdAt: now },
        { id: 202, title: 'Long Term Liabilities', type: 'long-term-liability', updatedAt: now, createdAt: now },
        { id: 300, title: 'Equity', type: 'equity', updatedAt: now, createdAt: now },
        { id: 400, title: 'Consulting Revenue', type: 'revenue', updatedAt: now, createdAt: now },
        { id: 401, title: 'Project Revenue', type: 'revenue', updatedAt: now, createdAt: now },
        { id: 402, title: 'Recurring Revenue', type: 'revenue', updatedAt: now, createdAt: now },
        { id: 403, title: 'Reimbursed Expenses', type: 'revenue', updatedAt: now, createdAt: now },
        { id: 404, title: 'Other Revenue', type: 'revenue', updatedAt: now, createdAt: now },
        { id: 500, title: 'Bank and Financial Charges', type: 'expense', updatedAt: now, createdAt: now },
        { id: 501, title: 'Books and Publications', type: 'expense', updatedAt: now, createdAt: now },
        { id: 502, title: 'Expensed Equipment', type: 'expense', updatedAt: now, createdAt: now },
        { id: 503, title: 'Gifts and Docations', type: 'expense', updatedAt: now, createdAt: now },
        { id: 504, title: 'Insurance', type: 'expense', updatedAt: now, createdAt: now },
        { id: 505, title: 'Licenses and Permits', type: 'expense', updatedAt: now, createdAt: now },
        { id: 506, title: 'Miscellaneous and Other Expenses', type: 'expense', updatedAt: now, createdAt: now },
        { id: 507, title: 'Office Supplies', type: 'expense', updatedAt: now, createdAt: now },
        { id: 508, title: 'Professional Fees', type: 'expense', updatedAt: now, createdAt: now },
        { id: 509, title: 'Rent Expense', type: 'expense', updatedAt: now, createdAt: now },
        { id: 510, title: 'Subscriptions', type: 'expense', updatedAt: now, createdAt: now },
        { id: 511, title: 'Telecommunications', type: 'expense', updatedAt: now, createdAt: now },
        { id: 512, title: 'Travel and Entertainment', type: 'expense', updatedAt: now, createdAt: now },
        { id: 513, title: 'Utilities', type: 'expense', updatedAt: now, createdAt: now },
        { id: 514, title: 'Interest Expense', type: 'interest-expense', updatedAt: now, createdAt: now },
        { id: 515, title: 'Taxes', type: 'tax-expense', updatedAt: now, createdAt: now },
        { id: 516, title: 'Depreciation Expense', type: 'depreciation-expense', updatedAt: now, createdAt: now },
    ]
    await knex('account').insert(accounts)
}
