/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as Knex from 'knex'
import Account from '../Account'

const data = {id: Account.Reserved.RetainedEarnings, title: 'Retained Earnings', type: 'equity'}

export async function up(knex: Knex): Promise<any> {
    const now = new Date()
    const a = await Account.query(knex).findById(data.id)
    if (!a) {
        await knex('account').insert({...data, updatedAt: now, createdAt: now })
    }
}

export async function down(knex: Knex): Promise<any> {
    // await Account.query(knex).deleteById(data.id)
}
