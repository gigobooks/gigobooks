/**
 * Copyright (c) 2020-present Beng Tan
 */

import Knex = require('knex');
import cloneDeep = require('lodash/cloneDeep')

// This is going to be used in a raw query so use snake_case
const upsertSuffix = ' on conflict(`name`) do update set' +
                     ' `value` = excluded.`value`,' +
                     ' `updated_at` = excluded.`updated_at`'

// The set/get model works as follows.
// Upon init(), retrieve all variables and cache them.
// Getters are synchronous and get from the cache.
// However, setters are asynchronous (because they reach the DB) and update the cache
// Rationale: async getters are a pain. async setters are not so bad.
export class Variables {
    cache: Record<string, any>

    constructor (public knex: Knex, public defaults: Record<string, any> = {}) {
        this.cache = cloneDeep(defaults)
    }

    async init() {
        const data = await this.knex('variable').select()
        for (let item of data) {
            try {
                this.cache[item.name] = JSON.parse(item.value)
            } catch (e) {
            }
        }
    }

    async set(name: string, value: any, sessionOnly = false, skipOnChange = false) {
        if (!sessionOnly) {
            const now = new Date()
            const q = this.knex('variable').insert({
                name,
                value: JSON.stringify(value),
                updatedAt: now,
                createdAt: now,
            }).toSQL().toNative()

            const p = this.knex.raw(q.sql + upsertSuffix, q.bindings)
            if (skipOnChange) {
                p.options({skipOnChange: true})
            }
            await p
        }

        // Update the cache
        this.cache[name] = value
    }

    // Given an object, takes each property and sets it as a variable
    async setMultiple(obj: Record<string, any>, sessionOnly = false) {
        if (!sessionOnly) {
            const now = new Date()
            const variables = []

            for (let name of Object.keys(obj)) {
                variables.push({
                    name,
                    value: JSON.stringify(obj[name]),
                    updatedAt: now,
                    createdAt: now,
                })
            }

            const q = this.knex('variable').insert(variables).toSQL().toNative()
            await this.knex.raw(q.sql + upsertSuffix, q.bindings)
        }

        // Update the cache
        Object.assign(this.cache, obj)
    }

    get(name: string): any {
        return cloneDeep(this.cache[name])
    }

    // Given an array of variable names OR an object with property names,
    // retrieves them all and returns them as properties of an object
    getMultiple(obj: string[] | Record<string, any>): Record<string, any> {
        const names: string[] = Array.isArray(obj) ? obj : Object.keys(obj)
        let results: Record<string, any> = {}

        for (let name of names) {
            results[name] = cloneDeep(this.cache[name])
        }
        return results
    }

    // This one bypasses the cache and actually retrieves from the database
    async _get(name: string): Promise<any> {
        let value = this.defaults[name]
        const results = await this.knex('variable').select('value').where('name', name)
        if (results.length > 0) {
            try {
                value = JSON.parse(results[0].value)
            } catch (e) {
            }
        }
        return value
    }

    // Given an array of variable names OR an object with property names,
    // retrieves them all and returns them as properties of an object
    // This one bypasses the cache and actually retrieves from the database
    async _getMultiple(obj: string[] | Record<string, any>): Promise<Record<string, any>> {
        const names: string[] = Array.isArray(obj) ? obj : Object.keys(obj)
        let results: Record<string, any> = {}

        for (let name of names) {
            results[name] = this.defaults[name]
        }

        const data = await this.knex('variable').select(['name', 'value']).whereIn('name', names)
        for (let item of data) {
            try {
                results[item.name] = JSON.parse(item.value)
            } catch (e) {
            }
        }
        return results
    }
}

export default Variables
