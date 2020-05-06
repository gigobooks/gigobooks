import { Base, Model, TransactionOrKnex } from './Base'
import { Element, IElement } from './Element'
import { isDateOnly } from '../util/util'

export enum TransactionType {
    Contribution = 'contribution',
    Dividend = 'dividend',
}

export class Transaction extends Base {
    static Credit = Element.Credit
    static Debit = Element.Debit

    static Contribution = TransactionType.Contribution
    static Dividend = TransactionType.Dividend

    id?: number
    description?: string
    type?: TransactionType
    // Date is stored as a ten character string ie. '2020-01-01' 
    date?: string
    actorId?: number
    elements?: Element[]

    // Given an array of vanilla (ie. non-Element) objects, merge them into .elements
    // For each item:
    //   If transactionId is supplied, it must match, otherwise: error
    //   If id is not supplied, append a new element
    //   If id is supplied, replace an existing element
    //   If id is supplied and an existing element is not found: error
    async mergeElements(list: IElement[]) {
        if (list.length == 0) {
            return Promise.reject('No items')
        }

        for (let i in list) {
            if (this.id && list[i].transactionId && list[i].transactionId != this.id) {
                return Promise.reject(`transactionId of item ${i} does not match`)
            }
        }

        // Don't assign or modify this.elements until after validation.
        const elements = this.elements ? [...this.elements] : []
        for (let i in list) {
            const e = Element.construct(list[i])
            if (e.id == undefined) {
                elements.push(e)
            }
            else {
                let matched = false
                for (let j in elements) {
                    if (elements[j].id == e.id) {
                        elements[j] = e
                        matched = true
                        break
                    }
                }
    
                if (!matched) {
                    return Promise.reject(`Id ${e.id} of item ${i} not found.`)
                }
            }
        }

        if (!Transaction.isBalanced(elements)) {
            return Promise.reject('Not balanced')
        }

        // Now 'commit' the changes
        this.elements = elements
    }

    // Load elements from the database
    async loadElements(trx?: TransactionOrKnex) {
        this.elements = await this.$relatedQuery('elements', trx)
    }

    get balanced() {
        return !this.elements || Transaction.isBalanced(this.elements)
    }

    // Gets the id of the first element which is credit or debit, if exists
    // Useful for getting a credit/debit element when we expect only one
    // (of that type) to exist.
    getFirstCrElementId(drcr = Transaction.Credit): number | undefined {
        if (this.elements) {
            for (let e of this.elements) {
                if (e.drcr == drcr) {
                    return e.id
                }
            }
        }
        return undefined
    }

    getFirstDrElementId(drcr = Transaction.Debit): number | undefined {
        return this.getFirstCrElementId(drcr)
    }

    // There is no explicit way to removes elements.
    // To remove an element, set it's amount to zero, `.save()` to the database
    // and if the save is succesful, call `.condenseelements()`

    async save(trx?: TransactionOrKnex) {
        if (!this.date || !isDateOnly(this.date)) {
            return Promise.reject('Invalid date')
        }

        if (!this.balanced) {
            return Promise.reject('Elements do not balance')
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

        if (this.elements) {
            for (let e of this.elements) {
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

    // Removes any elements with zero amounts.
    // This only removes from this.elements. It does not remove from the database.
    condenseElements() {
        if (this.elements) {
            this.elements = this.elements.filter(e => e.amount != 0)
        }
    }

    static tableName = 'txn'
    static relationMappings = {
        elements: {
            relation: Model.HasManyRelation,
            modelClass: Element,
            join: {
                from: 'txn.id',
                to: 'txn_element.transactionId'
            }
        }
    }

    static isBalanced(elements: IElement[]) {
        return elements.reduce((acc, e) => {
            return acc + e.drcr! * e.amount!
        }, 0) == 0
    }
}
