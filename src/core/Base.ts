/**
 * Copyright (c) 2020-present Beng Tan
 */

import { Model, TransactionOrKnex, QueryBuilder } from 'objection'
export { Model, TransactionOrKnex } from 'objection'

// https://stackoverflow.com/questions/45123761
type StaticThis<T> = { new (): T }

export class Base extends Model {
    updatedAt?: Date
    createdAt?: Date

    // Model subclasses can't have constructors which take arguments
    // Call this instead to construct new objects
    static construct<T extends Base>(this: StaticThis<T>, fields: object) {
        const obj = new this()
        Object.assign(obj, fields)

        if (obj.createdAt == undefined) {
            obj.createdAt = new Date()
        }
        if (obj.updatedAt == undefined) {
            obj.updatedAt = obj.createdAt
        }
        return obj
    }

    static get useLimitInFirst() { return true }

    async save(trx?: TransactionOrKnex) {
        this.updatedAt = new Date()
        // ToDo: This doesn't handle composite keys
        const idColumn: string = (this.constructor as any).idColumn
        const id: any = (this as any)[idColumn]
        return id == undefined ? (this.constructor as any).query(trx).insert(this)
            : (this.constructor as any).query(trx).patch(this).where(idColumn, id)
    }

    async delete(trx?: TransactionOrKnex) {
        // ToDo: This doesn't handle composite keys
        const idColumn: string = (this.constructor as any).idColumn
        const id: any = (this as any)[idColumn]
        return (this.constructor as any).query(trx).deleteById(id)
    }

    // When loading from the database, datetime/timestamp fields are ISO strings.
    // Convert them into Date objects
    $afterFind() {
        if ('createdAt' in this && !(this.createdAt instanceof Date)) {
            this.createdAt = new Date(this.createdAt!)
        }
        if ('updatedAt' in this && !(this.updatedAt instanceof Date)) {
            this.updatedAt = new Date(this.updatedAt!)
        }
    }

    static get modifiers(): {} {
        return {
            sortById(builder: QueryBuilder<any, any>) {
                builder.orderBy('id')
            }
        }
    }
}
