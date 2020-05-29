import { QueryBuilder } from 'objection'
import { Base, Model, TransactionOrKnex } from './Base'
import { Element, IElement } from './Element'
import { isDateOnly } from '../util/util'
import { Project } from './Project'
import Account from './Account'

// Add a `_parent` reference to Element. For internal use
type TElement = Element & { _parent?: TElement }

export enum TransactionType {
    Contribution = 'contribution',
    Dividend = 'dividend',
    Sale = 'sale',
    Invoice = 'invoice',
    InvoicePayment = 'invoice-payment',
    Purchase = 'purchase',
}

export class Transaction extends Base {
    static Credit = Element.Credit
    static Debit = Element.Debit

    static Contribution = TransactionType.Contribution
    static Dividend = TransactionType.Dividend
    static Sale = TransactionType.Sale
    static Invoice = TransactionType.Invoice
    static InvoicePayment = TransactionType.InvoicePayment
    static Purchase = TransactionType.Purchase

    id?: number
    description?: string
    type?: TransactionType
    // Date is stored as a ten character string ie. '2020-01-01' 
    date?: string
    actorId?: number
    elements?: TElement[]

    // Given an array of vanilla (ie. non-Element) objects, merge them into .elements
    // For each item:
    //   If transactionId is supplied, it must match, otherwise: error
    //   If id is not supplied, append a new element
    //   If id is supplied, replace an existing element
    //   If id is supplied and an existing element is not found: error
    // 
    // If there are any child elements, then there are additional requirements:
    //   Non-child elements are indicated by parentId being false-ish
    //   Child elements are indicated by putting parentId = -1
    //   The first element must be a non-child element
    //   Each parent element must be immediately followed by it's children elements.
    //   Conversely, each child element will be assigned a parent which is the
    //     most recent preceding non-child element
    async mergeElements(list: IElement[]) {
        if (list.length == 0) {
            return Promise.reject('No items')
        }

        for (let i in list) {
            if (this.id && list[i].transactionId && list[i].transactionId != this.id) {
                return Promise.reject(`transactionId of item ${i} does not match`)
            }
        }

        if (list[0].parentId) {
            return Promise.reject(`First element must be a non-child`)
        }

        // Don't assign or modify this.elements until after validation.
        const elements = this.elements ? [...this.elements] : []
        let parent: TElement
        for (let i in list) {
            const e: TElement = Element.construct(list[i])

            if (e.parentId == -1) {
                e._parent = parent!
            }
            else {
                e.parentId = 0
                parent = e
            }

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
        const currency: string = Project.variables.get('currency')
        const otherCurrencies: string[] = Project.variables.get('otherCurrencies')
        if (otherCurrencies.length > 0) {
            return false
        }

        if (this.elements) {
            for (let e of this.elements) {
                if (e.currency != currency) {
                    return false
                }
            }
        }

        return currency
    }

    // There is no explicit way to removes elements.
    // To remove an element: 
    //   o Set amount to zero. Set tax code to an empty string.
    //   o `.save()` to the database
    //   o If the save is succesful, call `.condenseElements()`

    // The reason why `.condenseElements()` is not automatically called is:
    // If the `.save()` was part of a transaction, there is no way to know if it
    // was committed or rollback-ed. Hence, `.condenseElements` is to be called
    // by the caller IF the caller knows that the save was successfully committed.
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
            // Separate elements into three batches: Non-child, children, and deletes
            const parents: TElement[] = []
            const children: TElement[] = []
            const deletes: TElement[] = []

            for (let e of this.elements) {
                if (e.amount != 0 || e.taxCode) {
                    e.transactionId = this.id
                    ;((e._parent || e.parentId) ? children : parents).push(e)
                }
                else if (e.id) {
                    deletes.push(e)
                }
            }

            // Do deletes first.
            for (let e of deletes) {
                // If there are any children, their parent is about to be deleted
                // so point them to this element for further processing below
                for (let c of children) {
                    if (c.parentId == e.id) {
                        c._parent = e
                    }
                }

                await e.delete(trx)

                // Indicate to any children that their parent has been deleted
                e.id = 0
            }
            
            // Save parents
            for (let e of parents) {
                await e.save(trx)
            }

            // Fill in parentId of children and save
            // However, if the parent has been deleted, then maybe delete the child
            for (let e of children) {
                // We only care about children which have `._parent`, assigned 
                // either from `.mergeElements()`, or from the deletion of the parent.
                if (e._parent) {
                    e.parentId = e._parent.id ? e._parent.id : 0
                    delete e._parent

                    if (!e.parentId && e.amount == 0) {
                        await e.delete(trx)
                    }
                    else {
                        await e.save(trx)
                    }
                }
            }
        }
    }

    // Removes non-child elements with zero amounts
    // Removes child elements with zero amounts AND an empty tax code.
    // This only removes from this.elements. It does not remove from the database.
    condenseElements() {
        if (this.elements) {
            this.elements = this.elements.filter(e => {
                const remove = (!e.parentId) || (e.parentId && !e.taxCode)
                return e.amount != 0 || !remove
            })
            // Also sort by id
            this.elements.sort((a, b) => a.id! - b.id!)
        }
    }

    // SQL WHERE condition to retrieve invoices which settle this.
    // Call like this: `.where(object.settlements())`
    settlements() {
        const self = this
        return function (builder: QueryBuilder<Transaction, Transaction[]>) {
            builder.whereIn('id', 
                function (builder: QueryBuilder<Transaction, Transaction[]>) {
                builder.select('transactionId').from('txnElement').where('settleId', self.id)
            })
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
                },
                modify: 'sortById',
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

    // Helper function to insert an SQL WHERE condition to retrieve unpaid invoices.
    // However, this will also retrieve overpaid invoices too.
    // Call like this: `.where(Transaction.unpaidInvoices)` 
    static unpaidInvoices(builder: QueryBuilder<Transaction, Transaction[]>,
                          type = Transaction.Invoice, accountId = Account.Reserved.AccountsReceivable) {
        builder.where('type', type)
        // Raw query: use snake case
        builder.whereRaw(`EXISTS (
            SELECT \`balance\` FROM (
                SELECT SUM(\`amount\`*\`drcr\`) as \`balance\` from \`txn_element\`
                WHERE (\`transaction_id\` = \`txn\`.\`id\` OR \`settle_id\` = \`txn\`.\`id\`)
                    AND \`account_id\` = ?
                GROUP BY \`currency\`
            ) WHERE \`balance\` <> 0
        )`, [accountId])
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
