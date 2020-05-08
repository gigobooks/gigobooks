import { Project } from './Project'

type HashObject = {
    [k: string]: any
}

const defaults: HashObject = {
}

// This is going to be used in a raw query so use snake_case
const upsertSuffix = ' on conflict(`name`) do update set' +
                     ' `value` = excluded.`value`,' +
                     ' `updated_at` = excluded.`updated_at`'

export class Variable {
    static async set(name: string, value: any, knex = Project.knex): Promise<void> {
        const now = new Date()
        const q = knex('variable').insert({
            name,
            value: JSON.stringify(value),
            updatedAt: now,
            createdAt: now,
        }).toSQL().toNative()
        await knex.raw(q.sql + upsertSuffix, q.bindings)
    }

    static async get(name: string, knex = Project.knex): Promise<any> {
        let value = defaults[name]
        const results = await knex('variable').select('value').where('name', name)
        if (results.length > 0) {
            try {
                value = JSON.parse(results[0].value)
            } catch (e) {
            }
        }
        return value
    }

    // Given an object, takes each property and sets it as a variable
    static async setMultiple(obj: HashObject, knex = Project.knex): Promise<void> {
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

        const q = knex('variable').insert(variables).toSQL().toNative()
        await knex.raw(q.sql + upsertSuffix, q.bindings)
    }

    // Given an array of variable names OR an object with property names,
    // retrieves them all and returns them as properties of an object
    static async getMultiple(obj: string[] | HashObject, knex = Project.knex): Promise<HashObject> {
        const names: string[] = Array.isArray(obj) ? obj : Object.keys(obj)
        let results: HashObject = {}

        for (let name of names) {
            results[name] = defaults[name]
        }

        const data = await knex('variable').select(['name', 'value']).whereIn('name', names)
        for (let item of data) {
            try {
                results[item.name] = JSON.parse(item.value)
            } catch (e) {
            }
        }
        return results
    }
}

export default Variable
