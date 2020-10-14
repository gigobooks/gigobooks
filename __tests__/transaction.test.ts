import { Project, Base, Account, Transaction, Element } from '../src/core'

const Debit = Transaction.Debit
const Credit = Transaction.Credit

const now = new Date()
const date = now.toISOString().substring(0, 10)

beforeAll(() => {
    return Project.create(':memory:')
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

test('create bare transaction', async done => {
    const t0 = Transaction.construct({date, description: 'This has no elements'})
    await t0.save()

    const t1 = await Transaction.query().findById(t0.id!)
    expect(t1).toMatchObject(t0)

    done()
})

test('balanced transaction', async done => {
    const t0 = Transaction.construct({date, description: 'balanced transaction'})

    const p = t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a'},
        {accountId: 10, drcr: Debit, amount: 10, currency: 'b'},
        {accountId: 30, drcr: Credit, amount: 10, currency: 'b'},
    ])
    await expect(p).resolves

    done()
})

test('unbalanced transaction', async done => {
    const t0 = Transaction.construct({date, description: 'unbalanced transaction'})

    // Attempt to make unbalanced elements
    const p1 = t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 90, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a'},
    ])
    await expect(p1).rejects.toMatch(/Not balanced/)
    expect(t0.elements).toBeFalsy()

    const p2 = t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'b'},
    ])
    await expect(p2).rejects.toMatch(/Not balanced/)
    expect(t0.elements).toBeFalsy()

    done()
})

test('create a transaction and retrieve', async done => {
    const t0 = Transaction.construct({date, description: 'create a transaction'})
    await t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a'},
    ])
    await t0.save()

    // Test some functions
    expect(t0.getFirstDrElement()).toBe(t0.elements![0])
    expect(t0.getFirstCrElement()).toBe(t0.elements![1])
    expect(t0.getDrElementIds()).toEqual([t0.elements![0].id])
    expect(t0.getCrElementIds()).toEqual([t0.elements![1].id])

    // Load the transaction, but without elements
    const t1 = await Transaction.query().findById(t0.id!)
    expect(t1.description).toBe('create a transaction')
    expect(t1.elements).toBeFalsy()

    // Now also load elements
    await t1.loadElements()
    expect(t1).toMatchObject(t0)

    // Load the transaction again, but in one step
    const t2 = await Transaction.query().findById(t0.id!).withGraphFetched('elements')
    expect(t2.description).toBe('create a transaction')
    expect(t1.elements).toEqual(t2.elements)

    done()
})

test('database transaction (commit)', async done => {
    // Create and save: (1) a Transaction, (2) an Account
    // but we do it in a database transaction.

    const t0 = Transaction.construct({date, description: 'database transaction (commit)'})
    await t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a'},
    ])
    const a0 = Account.construct({title: 'An asset', type: Account.Asset})

    await Base.transaction(async trx => {
        await t0.save(trx)
        await a0.save(trx)
    })

    const t1 = await Transaction.query().findById(t0.id!).withGraphFetched('elements')
    expect(t1).toMatchObject(t0)
    const a1 = await Account.query().findById(a0.id!)
    expect(a1).toMatchObject(a0)

    done()
})

test('unbalanced transaction (rollback)', async done => {
    const a0 = Account.construct({title: 'An asset', type: Account.Asset})
    const t0 = Transaction.construct({date,
        description: 'incorrect database transaction (rollback)',
    })

    // Manually inject unbalanced elements
    t0.elements = [
        Element.construct({accountId: 10, drcr: Debit, amount: 90, currency: 'a'}),
        Element.construct({accountId: 10, drcr: Credit, amount: 100, currency: 'a'}),
    ]

    // Attempt to save an invalid transaction. This should fail.
    // Incorporate it into a transaction and test that it rollback-ed
    const promise = Base.transaction(async trx => {
        await a0.save(trx)
        await t0.save(trx)
    })
    await expect(promise).rejects.toMatch(/Elements do not balance/)

    // Despite a0 being assigned an id during a0.save(),
    // it should be rolled back and should not be in the database
    const a1 = await Account.query().findById(a0.id!)
    expect(a1).toBeFalsy()

    done()
})

test('merge, modify and condense', async done => {
    // Construct and save a simple transaction
    const t0 = Transaction.construct({date, description: 'merge, modify and condense'})
    await t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a'},
    ])
    await t0.save()

    // Now add two more elements
    await t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 110, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 110, currency: 'a'},
    ])
    await t0.save()

    // Retrieve and compare
    let t: Transaction
    t = await Transaction.query().findById(t0.id!).withGraphFetched('elements')
    expect(t).toMatchObject(t0)

    // Split the last element (index=3) into two elements
    const e3id = t0.elements![3].id
    await t0.mergeElements([
        {id: e3id, accountId: 30, drcr: Credit, amount: 40, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 70, currency: 'a'},
    ])
    await t0.save()

    // Retrieve and compare
    t = await Transaction.query().findById(t0.id!).withGraphFetched('elements')
    expect(t).toMatchObject(t0)

    // Zero-out e3 and replace with two new elements
    await t0.mergeElements([
        {id: e3id, accountId: 30, drcr: Credit, amount: 0, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 10, currency: 'a'},
        {accountId: 30, drcr: Credit, amount: 30, currency: 'a'},
    ])
    await t0.save()
    // Should condenseElements because e3 is now stale
    t0.condenseElements()

    // Retrieve and compare
    t = await Transaction.query().findById(t0.id!).withGraphFetched('elements')
    expect(t).toMatchObject(t0)

    done()
})

test('child elements', async done => {
    const t0 = Transaction.construct({date, description: 'child elements'})

    const p = t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a', parentId: -1},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a'},
    ])
    await expect(p).rejects.toMatch(/First element must be a non-child/)

    await t0.mergeElements([
        {accountId: 10, drcr: Debit, amount: 100, currency: 'a', description: '1'},
        {accountId: 10, drcr: Debit, amount: 0, currency: 'a', description: '1.1', taxCode: 'gst', parentId: -1},
        {accountId: 10, drcr: Debit, amount: 10, currency: 'a', description: '1.2', taxCode: 'gst', parentId: -1},
        {accountId: 30, drcr: Credit, amount: 100, currency: 'a', description: '2'},
        {accountId: 30, drcr: Credit, amount: 0, currency: 'a', description: '2.1', taxCode: 'gst', parentId: -1},
        {accountId: 30, drcr: Credit, amount: 0, currency: 'a', description: '2.2', taxCode: 'gst', parentId: -1},
        {accountId: 30, drcr: Credit, amount: 10, currency: 'a', description: '2.3', taxCode: 'gst', parentId: -1},
    ])
    await t0.save()
    t0.condenseElements()

    // The elements have been sorted by condenseElements()
    expect(t0.elements!.length).toBe(7)
    expect(t0.elements![0].description).toBe('1')
    expect(t0.elements![1].description).toBe('2')
    expect(t0.elements![2].description).toBe('1.1')
    expect(t0.elements![3].description).toBe('1.2')
    expect(t0.elements![4].description).toBe('2.1')
    expect(t0.elements![5].description).toBe('2.2')
    expect(t0.elements![6].description).toBe('2.3')

    expect(t0.elements![0].parentId).toBe(0)
    expect(t0.elements![1].parentId).toBe(0)
    expect(t0.elements![2].parentId).toBe(t0.elements![0].id)
    expect(t0.elements![3].parentId).toBe(t0.elements![0].id)
    expect(t0.elements![4].parentId).toBe(t0.elements![1].id)
    expect(t0.elements![5].parentId).toBe(t0.elements![1].id)
    expect(t0.elements![6].parentId).toBe(t0.elements![1].id)

    // Remove tax code from '2.2' and merge/save/remove it
    await t0.mergeElements([
        {...t0.elements![1]},
        {...t0.elements![5], taxCode: '', parentId: -1},
    ])
    await t0.save()
    t0.condenseElements()

    expect(t0.elements!.length).toBe(6)
    expect(t0.elements![0].description).toBe('1')
    expect(t0.elements![1].description).toBe('2')
    expect(t0.elements![2].description).toBe('1.1')
    expect(t0.elements![3].description).toBe('1.2')
    expect(t0.elements![4].description).toBe('2.1')
    expect(t0.elements![5].description).toBe('2.3')

    expect(await Transaction.query().findById(t0.id!).withGraphFetched('elements')).toMatchObject(t0)

    // Remove parent elements. This should remove children with zero amounts
    await t0.mergeElements([
        {...t0.elements![0], amount: 0},
        {...t0.elements![1], amount: 0},
    ])
    await t0.save()
    t0.condenseElements()

    expect(t0.elements!.length).toBe(2)
    expect(t0.elements![0].description).toBe('1.2')
    expect(t0.elements![1].description).toBe('2.3')

    expect(await Transaction.query().findById(t0.id!).withGraphFetched('elements')).toMatchObject(t0)

    done()
})
