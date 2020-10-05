/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as Knex from 'knex'

const tableName = 'txn'
const columnName = 'due'

// Return a promise that resolves when the migration code has completed.
export async function up(knex: Knex): Promise<any> {
    if (!await knex.schema.hasColumn(tableName, columnName)) {
        await knex.schema.table(tableName, t => {
            t.text(columnName)
        })
    }
}

export async function down(knex: Knex): Promise<any> {}
