/**
 * Copyright (c) 2020-present Beng Tan
 */

import Knex = require('knex');
import { PrepopulatedAccounts } from './Account'

export async function maybeMigrate(knex: Knex) {
    return knex.migrate.latest()
}

export async function prepopulate(knex: Knex): Promise<void> {
    await knex.migrate.up({name: '001-origin.ts'} as any)

    const now = new Date()
    await knex('account').insert(PrepopulatedAccounts.map(account => {
        return { ...account, updatedAt: now, createdAt: now }
    }))

    await maybeMigrate(knex)
}
