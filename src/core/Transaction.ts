import { Base, Model, TransactionOrKnex } from './Base'
import { Element, IElement } from './Element'
import { isDateOnly } from '../util/util'
import { Project } from './Project'

export enum TransactionType {
    Contribution = 'contribution',
    Dividend = 'dividend',
    Sale = 'sale',
    Invoice = 'invoice',
    Purchase = 'purchase',
}

export class Transaction extends Base {
    static Credit = Element.Credit
    static Debit = Element.Debit

    static Contribution = TransactionType.Contribution
    static Dividend = TransactionType.Dividend
    static Sale = TransactionType.Sale
    static Invoice = TransactionType.Invoice
    static Purchase = TransactionType.Purchase

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

    // Gets the first element which is credit or debit, if exists
    getFirstCrElement(drcr = Transaction.Credit): Element | undefined {
        if (this.elements) {
            for (let e of this.elements) {
                if (e.drcr == drcr) {
                    return e
                }
            }
        }
        return undefined
    }

    getFirstDrElement(): Element | undefined {
        return this.getFirstCrElement(Transaction.Debit)
    }

    // Returns a list of ids of the credit elements
    getCrElementIds(drcr = Transaction.Credit): number[] {
        const list = []

        if (this.elements) {
            for (let e of this.elements) {
                if (e.drcr == drcr) {
                    list.push(e.id!)
                }
            }
        }
        return list
    }

    getDrElementIds(): number[] {
        return this.getCrElementIds(Transaction.Debit)
    }

    // If the project has a single currency configured, and this transaction
    // only has elements using that currency, then return the currency.
    // Otherwise, return false
    get singleCurrency(): string | false {
        const currencies = Project.variables.get('currencies')
        if (currencies.length != 1) {
            return false
        }

        if (this.elements) {
            for (let e of this.elements) {
                if (e.currency != currencies[0]) {
                    return false
                }
            }
        }

        return currencies[0]
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
    static get relationMappings() {
        return {
            elements: {
                relation: Model.HasManyRelation,
                modelClass: Element,
                join: {
                    from: 'txn.id',
                    to: 'txnElement.transactionId'
                }
            },
            settledBy: {
                relation: Model.HasManyRelation,
                modelClass: Element,
                join: {
                    from: 'txn.id',
                    to: 'txnElement.settleId'
                }
            },
        }
    }

    // Calculates totals for each currency and returns them as an array
    static getSums(elements: IElement[]) {
        return Transaction.getBalances(elements, true)
    }

    // Calculates balances for each currency and returns them as an array
    // If `sum` is true, then calculate totals instead (ie. ignore `drcr`)
    static getBalances(elements: IElement[], sum = false) {
        const balances: Record<string, number> = {}

        elements.forEach(e => {
            const currency = e.currency!
            if (balances[currency] == undefined) {
                balances[currency] = 0
            }
            balances[currency] += sum ? e.amount! : e.drcr! * e.amount!
        })

        return balances
    }

    static isBalanced(elements: IElement[]) {
        const balances = Transaction.getBalances(elements)
        return Object.keys(balances).every(currency => {
            return balances[currency] == 0
        })
    }
}
