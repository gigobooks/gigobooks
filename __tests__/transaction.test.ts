import { Project, Base, Account, Transaction, Entry } from '../src/core'

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
    const t0 = Transaction.construct({date, description: 'This has no entries'})
    await t0.save()

    const t1 = await Transaction.query().findById(t0.id as any)    
    expect(t1).toMatchObject(t0)

    done()
})

test('create a transaction and retrieve', async done => {
    const t0 = Transaction.construct({date, description: 'create a transaction'})
    await t0.mergeEntries([
        {accountId: 10, drcr: 1, amount: 100},
        {accountId: 30, drcr: -1, amount: 100},
    ])
    await t0.save()

    // Load the transaction, but without entries
    const t1 = await Transaction.query().findById(t0.id as any)
    expect(t1.description).toBe('create a transaction')
    expect(t1.entries).toBeFalsy()

    // Now also load entries
    await t1.loadEntries()
    expect(t1).toMatchObject(t0)

    // Load the transaction again, but in one step
    const t2 = await Transaction.query().findById(t0.id as any).withGraphFetched('entries')
    expect(t2.description).toBe('create a transaction')
    expect(t1.entries).toEqual(t2.entries)

    done()
})

test('unbalanced transaction', async done => {
    const t0 = Transaction.construct({date, description: 'unbalanced transaction'})

    // Attempt to make unbalanced entries
    const p1 = t0.mergeEntries([
        {accountId: 10, drcr: 1, amount: 90},
        {accountId: 30, drcr: -1, amount: 100},
    ])
    await expect(p1).rejects.toMatch(/Not balanced/)
    expect(t0.entries).toBeFalsy()

    done()
})

test('database transaction (commit)', async done => {
    // Create and save: (1) a Transaction, (2) an Account
    // but we do it in a database transaction.

    const t0 = Transaction.construct({date, description: 'database transaction (commit)'})
    await t0.mergeEntries([
        {accountId: 10, drcr: 1, amount: 100},
        {accountId: 30, drcr: -1, amount: 100},
    ])
    const a0 = Account.construct({title: 'An asset', type: Account.Asset})

    await Base.transaction(async trx => {
        await t0.save(trx)
        await a0.save(trx)
    })

    const t1 = await Transaction.query().findById(t0.id as any).withGraphFetched('entries')
    expect(t1).toMatchObject(t0)
    const a1 = await Account.query().findById(a0.id as any)
    expect(a1).toMatchObject(a0)

    done()
})

test('unbalanced transaction (rollback)', async done => {
    const a0 = Account.construct({title: 'An asset', type: Account.Asset})
    const t0 = Transaction.construct({date,
        description: 'incorrect database transaction (rollback)',
    })

    // Manually inject unbalanced entries
    t0.entries = [
        Entry.construct({accountId: 10, drcr: 1, amount: 90}),
        Entry.construct({accountId: 10, drcr: -1, amount: 100}),
    ]

    // Attempt to save an invalid transaction. This should fail.
    // Incorporate it into a transaction and test that it rollback-ed
    const promise = Base.transaction(async trx => {
        await a0.save(trx)
        await t0.save(trx)
    })
    await expect(promise).rejects.toMatch(/Entries do not balance/)

    // Despite a0 being assigned an id during a0.save(),
    // it should be rolled back and should not be in the database
    const a1 = await Account.query().findById(a0.id as any)
    expect(a1).toBeFalsy()

    done()
})

test('merge, modify and condense', async done => {
    // Construct and save a simple transaction
    const t0 = Transaction.construct({date, description: 'merge, modify and condense'})
    await t0.mergeEntries([
        {accountId: 10, drcr: 1, amount: 100},
        {accountId: 30, drcr: -1, amount: 100},
    ])
    await t0.save()

    // Now add two more entries
    await t0.mergeEntries([
        {accountId: 10, drcr: 1, amount: 110},
        {accountId: 30, drcr: -1, amount: 110},
    ])
    await t0.save()

    // Retrieve and compare
    let t: Transaction
    t = await Transaction.query().findById(t0.id as any).withGraphFetched('entries')
    expect(t).toMatchObject(t0)

    // Split the last entry (index=3) into two entries
    const e3id = t0.entries![3].id
    await t0.mergeEntries([
        {id: e3id, accountId: 30, drcr: -1, amount: 40},
        {accountId: 30, drcr: -1, amount: 70},
    ])
    await t0.save()

    // Retrieve and compare
    t = await Transaction.query().findById(t0.id as any).withGraphFetched('entries')
    expect(t).toMatchObject(t0)

    // Zero-out e3 and replace with two new entries
    await t0.mergeEntries([
        {id: e3id, accountId: 30, drcr: -1, amount: 0},
        {accountId: 30, drcr: -1, amount: 10},
        {accountId: 30, drcr: -1, amount: 30},
    ])
    await t0.save()
    // Should condenseEntries because e3 is now stale
    t0.condenseEntries()

    // Retrieve and compare
    t = await Transaction.query().findById(t0.id as any).withGraphFetched('entries')
    expect(t).toMatchObject(t0)

    done()
})
