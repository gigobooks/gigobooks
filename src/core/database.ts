/**
 * Copyright (c) 2020-present Beng Tan
 */

import Knex = require('knex');
import { PrepopulatedAccounts } from './Account'

export async function maybeMigrate(knex: Knex) {
    return knex.migrate.latest()
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
