/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as Knex from 'knex'
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

type Options = {
    index?: boolean
}

// Warning: If this is called from within a knex migration, it probably has to use
// 'snake case' identifiers as it seems that Objection's `knexSnakeCaseMappers()`
// doesn't work. Not sure why. Something about Knex not calling `wrapIdentifier`
// (which is used by `knexSnakeCaseMappers`) for (some subset of?) migration code?
export async function maybeAddColumn(knex: Knex, table: string, column: string, type: 'text' | 'integer' = 'text', options: Options = {}): Promise<boolean> {
    const exists = await knex.schema.hasColumn(table, column)
    if (!exists) {
        await knex.schema.table(table, t => {
            let chain: Knex.ColumnBuilder
            if (type == 'integer') {
                chain = t.integer(column)
            }
            else {
                chain = t.text(column)
            }

            if (options.index) {
                chain = chain.index()
            }
        })

        // Indicate to caller that a column was added
        return true
    }

    return false
}
