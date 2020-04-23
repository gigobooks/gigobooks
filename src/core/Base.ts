import { Model, TransactionOrKnex } from 'objection'
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
}
