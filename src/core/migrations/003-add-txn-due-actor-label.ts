/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as Knex from 'knex'
import { maybeAddColumn } from '../database'

// Return a promise that resolves when the migration code has completed.
export async function up(knex: Knex): Promise<any> {
    await maybeAddColumn(knex, 'txn', 'due', 'text')
    await maybeAddColumn(knex, 'actor', 'tax_id_label', 'text')
}

export async function down(knex: Knex): Promise<any> {}
