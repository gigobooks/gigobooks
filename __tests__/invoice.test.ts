import { Project, Base, Account, Transaction, Element } from '../src/core'

const AccountsReceivable = Account.Reserved.AccountsReceivable
const Cash = Account.Reserved.Cash
const Debit = Transaction.Debit
const Credit = Transaction.Credit
const Invoice = Transaction.Invoice

const now = new Date()
const date = now.toISOString().substring(0, 10)

beforeAll(() => {
    return Project.create(':memory:')
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

test('create and retrieve invoices', async done => {
    const inv1 = Transaction.construct({date, type: Invoice, description: 'invoice 1'})
    await inv1.mergeElements([
        {accountId: AccountsReceivable, drcr: Debit, amount: 10, currency: 'USD'},
        {accountId: 400, drcr: Credit, amount: 10, currency: 'USD'},
        {accountId: AccountsReceivable, drcr: Debit, amount: 100, currency: 'EUR'},
        {accountId: 400, drcr: Credit, amount: 100, currency: 'EUR'},
    ])
    await inv1.save()

    let results: any = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv1.id)

    const inv2 = Transaction.construct({date, type: Invoice, description: 'invoice 2'})
    await inv2.mergeElements([
        {accountId: AccountsReceivable, drcr: Debit, amount: 33, currency: 'USD'},
        {accountId: AccountsReceivable, drcr: Debit, amount: 967, currency: 'USD'},
        {accountId: 400, drcr: Credit, amount: 1000, currency: 'USD'},
    ])
    await inv2.save()

    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(2)
    expect(results[1].id).toBe(inv2.id)

    // Settle inv1
    const s1 = Transaction.construct({date, description: 'settle 1'})
    await s1.mergeElements([
        {accountId: Cash, drcr: Debit, amount: 10, currency: 'USD', settleId: inv1.id},
        {accountId: AccountsReceivable, drcr: Credit, amount: 10, currency: 'USD', settleId: inv1.id},
        {accountId: Cash, drcr: Debit, amount: 100, currency: 'EUR', settleId: inv1.id},
        {accountId: AccountsReceivable, drcr: Credit, amount: 100, currency: 'EUR', settleId: inv1.id},
    ])
    await s1.save()

    // inv1 is settled. Only inv2 should be retrieved
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Remove a currency pair from s1, save it, and inv1 should be unsettled again
    await s1.mergeElements([
        {id: s1.elements![0].id, drcr: Debit, amount: 0},
        {id: s1.elements![1].id, drcr: Credit, amount: 0},
    ])
    await s1.save()
    s1.condenseElements()

    // inv1 and inv2 are both unsettled
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(2)
    expect(results[0].id).toBe(inv1.id)
    expect(results[1].id).toBe(inv2.id)

    // Put back the currency pair in s1, save it, and settle inv1
    await s1.mergeElements([
        {accountId: Cash, drcr: Debit, amount: 10, currency: 'USD', settleId: inv1.id},
        {accountId: AccountsReceivable, drcr: Credit, amount: 10, currency: 'USD', settleId: inv1.id},
    ])
    await s1.save()

    // inv1 is settled. Only inv2 should be retrieved
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Settle inv2
    const s2 = Transaction.construct({date, description: 'settle 2'})
    await s2.mergeElements([
        {accountId: Cash, drcr: Debit, amount: 1000, currency: 'USD', settleId: inv2.id},
        {accountId: AccountsReceivable, drcr: Credit, amount: 1000, currency: 'USD', settleId: inv2.id},
    ])
    await s2.save()

    // Both are settled. Should retrieve nothing
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(0)

    // Change currency of s2
    await s2.mergeElements([
        {id: s2.elements![0].id, accountId: Cash, drcr: Debit, amount: 1000, currency: 'EUR', settleId: inv2.id},
        {id: s2.elements![1].id, accountId: AccountsReceivable, drcr: Credit, amount: 1000, currency: 'EUR', settleId: inv2.id},
    ])
    await s2.save()

    // Now inv2 is unsettled
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Change s2 back to correct currency, but overpay
    await s2.mergeElements([
        {id: s2.elements![0].id, accountId: Cash, drcr: Debit, amount: 1001, currency: 'USD', settleId: inv2.id},
        {id: s2.elements![1].id, accountId: AccountsReceivable, drcr: Credit, amount: 1001, currency: 'USD', settleId: inv2.id},
    ])
    await s2.save()

    // inv2 is still unsettled
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Modify s2 to underpay inv2
    await s2.mergeElements([
        {id: s2.elements![0].id, accountId: Cash, drcr: Debit, amount: 900, currency: 'USD', settleId: inv2.id},
        {id: s2.elements![1].id, accountId: AccountsReceivable, drcr: Credit, amount: 900, currency: 'USD', settleId: inv2.id},
    ])
    await s2.save()

    // inv2 is still unsettled
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Make an additional payment for inv2
    const s2a = Transaction.construct({date, description: 'settle 2a'})
    await s2a.mergeElements([
        {accountId: Cash, drcr: Debit, amount: 90, currency: 'USD', settleId: inv2.id},
        {accountId: AccountsReceivable, drcr: Credit, amount: 90, currency: 'USD', settleId: inv2.id},
    ])
    await s2a.save()

    // inv2 is still unsettled
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Finally, modify inv2 to match what has been paid so far
    await inv2.mergeElements([
        {id: inv2.elements![0].id, accountId: 400, drcr: Credit, amount: 90, currency: 'USD'},
        {id: inv2.elements![1].id, accountId: AccountsReceivable, drcr: Debit, amount: 990, currency: 'USD'},
        {id: inv2.elements![2].id, accountId: 400, drcr: Credit, amount: 900, currency: 'USD'},
    ])
    await inv2.save()
    inv2.condenseElements()

    // Both are settled. Should retrieve nothing
    results = await Transaction.query().select().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(0)

    done()
})
