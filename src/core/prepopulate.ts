import Knex = require('knex');
import schema from './schema/schema0'
import { PrepopulatedAccounts } from './Account'

export default async function prepopulate(db: sqlite.Database, knex: Knex): Promise<void> {
    const now = new Date()
    for (let q of schema) {
        await db.exec(q)
    }

    await knex('variable').insert({
        name: 'magic', value: 'sunrise',  updatedAt: now, createdAt: now
    })

    await knex('account').insert(PrepopulatedAccounts.map(account => {
        return { ...account, updatedAt: now, createdAt: now }
    }))
}
