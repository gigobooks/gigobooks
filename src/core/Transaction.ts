import { Base, Model, TransactionOrKnex } from './Base'
import { Entry, IEntry } from './Entry'
import { isDateOnly } from '../util/util'

export enum TransactionType {
    Contribution = 'contribution',
    Dividend = 'dividend',
}

export class Transaction extends Base {
    static Credit = Entry.Credit
    static Debit = Entry.Debit

    static Contribution = TransactionType.Contribution
    static Dividend = TransactionType.Dividend

    id?: number
    description?: string
    type?: TransactionType
    // Date is stored as a ten character string ie. '2020-01-01' 
    date?: string
    entries?: Entry[]

    // Given an array of vanilla (ie. non-Entry) objects, merge them into .entries
    // For each item:
    //   If transactionId is supplied, it must match, otherwise: error
    //   If id is not supplied, append a new entry
    //   If id is supplied, replace an existing entry
    //   If id is supplied and an existing entry is not found: error
    async mergeEntries(list: IEntry[]) {
        if (list.length == 0) {
            return Promise.reject('No items')
        }

        for (let i in list) {
            if (this.id && list[i].transactionId && list[i].transactionId != this.id) {
                return Promise.reject(`transactionId of item ${i} does not match`)
            }
        }

        // Don't assign or modify this.entries until after validation.
        const entries = this.entries ? [...this.entries] : []
        for (let i in list) {
            const e = Entry.construct(list[i])
            if (e.id == undefined) {
                entries.push(e)
            }
            else {
                let matched = false
                for (let j in entries) {
                    if (entries[j].id == e.id) {
                        entries[j] = e
                        matched = true
                        break
                    }
                }
    
                if (!matched) {
                    return Promise.reject(`Id ${e.id} of item ${i} not found.`)
                }
            }
        }

        if (!Transaction.isBalanced(entries)) {
            return Promise.reject('Not balanced')
        }

        // Now 'commit' the changes
        this.entries = entries
    }

    // Load entries from the database
    async loadEntries(trx?: TransactionOrKnex) {
        this.entries = await this.$relatedQuery('entries', trx)
    }

    get balanced() {
        return !this.entries || Transaction.isBalanced(this.entries)
    }

    // Gets the id of the first entry which is credit or debit, if exists
    // Useful for getting a credit/debit entry when we expect only one
    // (of that type) to exist.
    getFirstCrEntryId(drcr = Transaction.Credit): number | undefined {
        if (this.entries) {
            for (let e of this.entries) {
                if (e.drcr == drcr) {
                    return e.id
                }
            }
        }
        return undefined
    }

    getFirstDrEntryId(drcr = Transaction.Debit): number | undefined {
        return this.getFirstCrEntryId(drcr)
    }

    // There is no explicit way to removes entries.
    // To remove an entry, set it's amount to zero, `.save()` to the database
    // and if the save is succesful, call `.condenseEntries()`

    async save(trx?: TransactionOrKnex) {
        if (!this.date || !isDateOnly(this.date)) {
            return Promise.reject('Invalid date')
        }

        if (!this.balanced) {
            return Promise.reject('Entries do not balance')
        }

        this.updatedAt = new Date()
        return trx ? this._save(trx) :
            Base.transaction(async trx => {return this._save(trx)})
    }

    async _save(trx: TransactionOrKnex) {
        if (this.id == undefined) {
            await Transaction.query(trx).insert(this)
        }
        else {
            await Transaction.query(trx).patch(this).where('id', this.id)
        }

        if (this.entries) {
            for (let e of this.entries) {
                if (e.amount != 0) {
                    e.transactionId = this.id
                    await e.save(trx)
                }
                else if (e.id) {
                    await e.delete(trx)
                }
            }
        }
    }

    // Removes any entries with zero amounts.
    // This only removes from this.entries. It does not remove from the database.
    condenseEntries() {
        if (this.entries) {
            this.entries = this.entries.filter(e => e.amount != 0)
        }
    }

    static tableName = 'txn'
    static relationMappings = {
        entries: {
            relation: Model.HasManyRelation,
            modelClass: Entry,
            join: {
                from: 'txn.id',
                to: 'txn_entry.transactionId'
            }
        }
    }

    static isBalanced(entries: IEntry[]) {
        return entries.reduce((acc, e) => {
            return acc + e.drcr! * e.amount!
        }, 0) == 0
    }
}
