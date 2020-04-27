import { Account, Project } from '../src/core'

beforeAll(() => {
    return Project.create(':memory:')
})

afterAll(() => {
    Project.knex.destroy()
    return Project.close()
})

test('create accounts', async done => {
    const a1 = Account.construct({title: 'An asset', type: Account.Asset})
    await a1.save()
    expect(a1.id).toBe(100)

    const a2 = Account.construct({title: 'Another asset', type: Account.LongTermAsset})
    await a2.save()
    expect(a2.id).toBe(101)

    const l1 = Account.construct({title: 'A liability', type: Account.Liability})
    await l1.save()
    expect(l1.id).toBe(201)

    const l2 = Account.construct({title: 'Another liability', type: Account.LongTermLiability})
    await l2.save()
    expect(l2.id).toBe(202)

    const q1 = Account.construct({title: 'An equity', type: Account.Equity})
    await q1.save()
    expect(q1.id).toBe(300)

    const q2 = Account.construct({title: 'Another equity', type: Account.Equity})
    await q2.save()
    expect(q2.id).toBe(301)

    const r1 = Account.construct({title: 'A revenue', type: Account.Revenue})
    await r1.save()
    expect(r1.id).toBe(405)

    const r2 = Account.construct({title: 'Another revenue', type: Account.Revenue})
    await r2.save()
    expect(r2.id).toBe(406)

    const e1 = Account.construct({title: 'An expense', type: Account.Expense})
    await e1.save()
    expect(e1.id).toBe(514)

    const e2 = Account.construct({title: 'Another expense', type: Account.InterestExpense})
    await e2.save()
    expect(e2.id).toBe(515)

    done()
})

test('modify accounts', async done => {
    // Retrieve an unreserved account
    const a1 = await Account.query().findById(100)
    expect(a1.title).toBe('An asset')

    // Modify and save it
    a1.title = 'A great asset'
    await a1.save()

    // Retrieve it again. Was the modification saved?
    const a2 = await Account.query().findById(100)
    expect(a2.title).toBe('A great asset')

    // Retrieve a reserved account
    const c = await Account.query().findById(10)
    expect(c).toHaveProperty('id')

    // Try to save it. It should fail.
    const promise = c.save()
    await expect(promise).rejects.toMatch(/Cannot modify a reserved account/)

    done()
})
