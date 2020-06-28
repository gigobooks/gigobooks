/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as Knex from 'knex'

export async function up(knex: Knex): Promise<any> {
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
        t.text('taxId')
        t.text('address')
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
        t.text('taxCode')
        t.integer('parentId').index().defaultTo(0)
        t.integer('useGross').defaultTo(0)
        t.integer('grossAmount')
        t.text('updatedAt')
        t.text('createdAt')
    })
}

export async function down(knex: Knex): Promise<any> {
}
