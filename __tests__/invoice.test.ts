import { Project, Base, Account, Transaction } from '../src/core'
import { extractFormValues, saveFormData, validateFormData } from '../src/components/Invoice'
import { MockForm } from './support'

const AccountsReceivable = Account.Reserved.AccountsReceivable
const TaxPayable = Account.Reserved.TaxPayable
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

beforeEach(() => {
    MockForm.clear()
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

    let results: any = await Transaction.query().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv1.id)

    const inv2 = Transaction.construct({date, type: Invoice, description: 'invoice 2'})
    await inv2.mergeElements([
        {accountId: AccountsReceivable, drcr: Debit, amount: 33, currency: 'USD'},
        {accountId: AccountsReceivable, drcr: Debit, amount: 967, currency: 'USD'},
        {accountId: 400, drcr: Credit, amount: 1000, currency: 'USD'},
    ])
    await inv2.save()

    results = await Transaction.query().where(Transaction.unpaidInvoices)
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
    results = await Transaction.query().where(Transaction.unpaidInvoices)
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
    results = await Transaction.query().where(Transaction.unpaidInvoices)
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
    results = await Transaction.query().where(Transaction.unpaidInvoices)
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
    results = await Transaction.query().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(0)

    // Change currency of s2
    await s2.mergeElements([
        {id: s2.elements![0].id, accountId: Cash, drcr: Debit, amount: 1000, currency: 'EUR', settleId: inv2.id},
        {id: s2.elements![1].id, accountId: AccountsReceivable, drcr: Credit, amount: 1000, currency: 'EUR', settleId: inv2.id},
    ])
    await s2.save()

    // Now inv2 is unsettled
    results = await Transaction.query().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Change s2 back to correct currency, but overpay
    await s2.mergeElements([
        {id: s2.elements![0].id, accountId: Cash, drcr: Debit, amount: 1001, currency: 'USD', settleId: inv2.id},
        {id: s2.elements![1].id, accountId: AccountsReceivable, drcr: Credit, amount: 1001, currency: 'USD', settleId: inv2.id},
    ])
    await s2.save()

    // inv2 is still unsettled
    results = await Transaction.query().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(inv2.id)

    // Modify s2 to underpay inv2
    await s2.mergeElements([
        {id: s2.elements![0].id, accountId: Cash, drcr: Debit, amount: 900, currency: 'USD', settleId: inv2.id},
        {id: s2.elements![1].id, accountId: AccountsReceivable, drcr: Credit, amount: 900, currency: 'USD', settleId: inv2.id},
    ])
    await s2.save()

    // inv2 is still unsettled
    results = await Transaction.query().where(Transaction.unpaidInvoices)
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
    results = await Transaction.query().where(Transaction.unpaidInvoices)
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
    results = await Transaction.query().where(Transaction.unpaidInvoices)
    expect(results.length).toBe(0)

    // Retrieve transactions which settle inv2
    results = await Transaction.query().where(inv2.settlements())
    expect(results.length).toBe(2)
    expect(results[0].id).toBe(s2.id)
    expect(results[1].id).toBe(s2a.id)

    done()
})

test('invoice form', async done => {
    expect(validateFormData(MockForm, {actorId: 0, date: new Date(), elements: []}))
        .toBe(false)
    expect(MockForm.field).toEqual('actorId')
    expect(MockForm.message).toEqual('Customer is required')

    // Save an invoice using form data
    let t0 = Transaction.construct({})
    let result = await saveFormData(MockForm, t0, {actorId: 1, date: now, description: 'foo', elements: [
        {accountId: 400, amount: '10', currency: 'USD', useGross: 0, grossAmount: '11', description: 'one', taxes: [
            {description: 'one a', code: ':zero:0', rate: '0', amount: '0'},
            {description: 'one b', code: '', rate: '10', amount: '1'},
            {description: 'one empty', code: '', rate: '', amount: '0'},
        ]},
        {accountId: 400, amount: '', currency: '', useGross: 0, grossAmount: '', description: 'empty'},
        {accountId: 401, amount: '100', currency: '', useGross: 1, grossAmount: '120', description: 'two', taxes: [
            {description: 'two a', code: '::10', rate: '10', amount: '10'},
            {description: 'two b', code: '::10', rate: '10', amount: '10'},
        ]},
    ]})
    expect(result).toBeTruthy()
    expect(t0.actorId).toBe(1)
    expect(t0.date).toBe(date)
    expect(t0.description).toBe('foo')
    expect(t0.elements!.length).toBe(7)
    expect(t0.elements![0]).toMatchObject({accountId: 400, amount: 1000, currency: 'USD', useGross: 0, grossAmount: 1100, description: 'one'})
    expect(t0.elements![1]).toMatchObject({accountId: 401, amount: 10000, currency: 'USD', useGross: 1, grossAmount: 12000, description: 'two'})
    expect(t0.elements![2]).toMatchObject({accountId: AccountsReceivable, amount: 13100, currency: 'USD'})
    expect(t0.elements![3]).toMatchObject({accountId: TaxPayable, amount: 0, currency: 'USD', taxCode: ':zero:0', parentId: t0.elements![0].id, description: 'one a'})
    expect(t0.elements![4]).toMatchObject({accountId: TaxPayable, amount: 100, currency: 'USD', taxCode: '::10', parentId: t0.elements![0].id, description: 'one b'})
    expect(t0.elements![5]).toMatchObject({accountId: TaxPayable, amount: 1000, currency: 'USD', taxCode: '::10', parentId: t0.elements![1].id, description: 'two a'})
    expect(t0.elements![6]).toMatchObject({accountId: TaxPayable, amount: 1000, currency: 'USD', taxCode: '::10', parentId: t0.elements![1].id, description: 'two b'})

    // Retrieve it and check
    const t1 = await Transaction.query().findById(result).withGraphFetched('elements')
    expect(t1).toMatchObject(t0)
    expect(t0).toMatchObject(t1)

    // Convert to form data
    let data = extractFormValues(t1)
    expect(data).toMatchObject({actorId: 1, description: 'foo'})
    expect(data.elements.length).toBe(2)
    expect(data.elements[0].taxes!.length).toBe(2)
    expect(data.elements[1].taxes!.length).toBe(2)
    expect(data.elements).toMatchObject([
        {eId: t1.elements![0].id, accountId: 400, amount: '10.00', currency: 'USD', useGross: 0, grossAmount: '11.00', description: 'one', taxes: [
            {eId: t1.elements![3].id, description: 'one a', code: ':zero:0', rate: '0', amount: '0.00'},
            {eId: t1.elements![4].id, description: 'one b', code: '::10', rate: '10', amount: '1.00'},
        ]},
        {eId: t1.elements![1].id, accountId: 401, amount: '100.00', currency: 'USD', useGross: 1, grossAmount: '120.00', description: 'two', taxes: [
            {eId: t1.elements![5].id, description: 'two a', code: '::10', rate: '10', amount: '10.00'},
            {eId: t1.elements![6].id, description: 'two b', code: '::10', rate: '10', amount: '10.00'},
        ]},
    ])

    // Remove tax 'two a', fiddle with 'two b', re-save
    data.elements[1].grossAmount = '110'
    Object.assign(data.elements[1].taxes![0], {code: '', rate: '0.0', amount: '0.0'})
    Object.assign(data.elements[1].taxes![1], {code: '', rate: '0'})

    result = await saveFormData(MockForm, t1, data)
    expect(result).toBeTruthy()
    expect(t1.elements!.length).toBe(6)
    expect(t1.elements![2]).toMatchObject({accountId: AccountsReceivable, amount: 12100, currency: 'USD'})
    expect(t1.elements![5]).toMatchObject({accountId: TaxPayable, amount: 1000, currency: 'USD', taxCode: '', parentId: t0.elements![1].id, description: 'two b'})

    // Retrieve and check
    const t2 = await Transaction.query().findById(result).withGraphFetched('elements')
    expect(t2).toMatchObject(t1)
    expect(t1).toMatchObject(t2)

    done()
})
