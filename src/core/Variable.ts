import { Project } from './Project'

const defaults: any = {
}

export class Variable {
    static async set(name: string, value: any, knex = Project.knex): Promise<void> {
        const now = new Date()
        const exists = (await knex('variable').select('name').where('name', name)).length > 0
        if (exists) {
            await knex('variable').where('name', name).update({
                value: JSON.stringify(value),
                updatedAt: now
            })
        }
        else {
            await knex('variable').insert({
                name,
                value: JSON.stringify(value),
                updatedAt: now,
                createdAt: now,
            })
        }
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
}

export default Variable
