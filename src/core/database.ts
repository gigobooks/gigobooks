import Knex = require('knex');
import { PrepopulatedAccounts } from './Account'

export async function maybeMigrate(knex: Knex) {
    return knex.transaction(async function (trx) {
        let version: number = (await trx('pragma_user_version').select())[0].userVersion

        if (version < migrations.length) {
            for (; version < migrations.length; version++) {
                await migrations[version](trx)
            }
            await trx.raw(`PRAGMA user_version = ${version}`)
        }
    })
}

export async function prepopulate(knex: Knex): Promise<void> {
    const now = new Date()
    await maybeMigrate(knex)

    await knex('variable').insert({
        name: 'magic', value: JSON.stringify('sunrise'),  updatedAt: now, createdAt: now
    })

    await knex('account').insert(PrepopulatedAccounts.map(account => {
        return { ...account, updatedAt: now, createdAt: now }
    }))
}

const migrations = [
    m01,
]

async function m01(knex: Knex) {
    await knex.schema.createTable('variable', t => {
        t.text('name').notNullable().primary()
        t.text('value')
        t.text('updatedAt')
        t.text('createdAt')
    })

    await knex.schema.createTable('account', t => {
        t.integer('id').notNullable().primary()
        t.text('title')
        t.text('type')
        t.text('updatedAt')
        t.text('createdAt')
    })

    await knex.schema.createTable('actor', t => {
        t.integer('id').notNullable().primary()
        t.text('title')
        t.text('type')
        t.text('updatedAt')
        t.text('createdAt')
    })

    await knex.schema.createTable('txn', t => {
        t.integer('id').notNullable().primary()
        t.text('description')
        t.text('type')
        t.text('date')
        t.integer('actorId').index().defaultTo(0)
        t.text('updatedAt')
        t.text('createdAt')
    })

    await knex.schema.createTable('txn_element', t => {
        t.integer('id').notNullable().primary()
        t.integer('transactionId').index()
        t.text('description')
        t.integer('accountId').index()
        t.integer('drcr')
        t.integer('amount')
        t.text('currency')
        t.integer('settleId').index().defaultTo(0)
        t.text('updatedAt')
        t.text('createdAt')
    })
}
