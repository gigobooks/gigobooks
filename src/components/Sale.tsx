import * as React from 'react'
import { Controller, useForm, useFieldArray, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { Transaction, Account, Actor } from '../core'
import { toDateOnly, FormHelpers } from '../util/util'
import { parseISO } from 'date-fns'
import { flatSelectOptions } from './SelectOptions'

const PositiveAmount = FormHelpers.Validation.PositiveAmount

type Props = {
    arg1?: string
}

type FormData = {
    actorId: number
    date: Date
    description?: string
    elements: {
        // `.id` is used by the form system so we have eId to store 'our' id
        eId?: number
        accountId: number
        amount: string
        description?: string
    }[]
    accountId: number
    submit?: string    // Only for displaying general submit error messages
}

export default function Sale(props: Props) {
    // argId == 0 means creating a new transaction
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [transaction, setTransaction] = React.useState<Transaction>()
    const [revenueOptions, setRevenueOptions] = React.useState<{}>()
    const [assetOptions, setAssetOptions] = React.useState<{}>()
    const [customerOptions, setCustomerOptions] = React.useState<{}>()
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'elements'})

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load revenue and asset accounts
        Account.query().select()
        .whereIn('type', [Account.Asset, ...Account.TypeGroupInfo[Account.Revenue].types])
        .whereNot('id', Account.Reserved.AccountsReceivable)
        .orderBy(['title'])
        .then((rows) => {
            // Split into revenues and assets
            setRevenueOptions(flatSelectOptions(rows.filter(a => a.typeGroup == Account.Revenue)))
            setAssetOptions(flatSelectOptions(rows.filter(a => a.typeGroup == Account.Asset)))
        })

        // Load customers
        Actor.query().select()
        .where('type', Actor.Customer)
        .orderBy('title')
        .then((rows: Actor[]) => {
            setCustomerOptions(flatSelectOptions(rows))
        })
        
        // Load transaction (if exists) and initialise form accordingly
        if (argId > 0) {
            Transaction.query().findById(argId).where('type', Transaction.Sale)
            .withGraphFetched('elements')
            .then(t => {
                setTransaction(t)
                if (t) {
                    form.reset(extractFormValues(t))
                }
            })
        }
        else {
            setTransaction(Transaction.construct({}))
            form.reset({
                actorId: 0,
                date: new Date(),
                elements: [{}, {}],
                accountId: Account.Reserved.Cash,
            })
        }
    }, [props.arg1])

    const onSubmit = (data: FormData) => {
        saveFormData(form, transaction!, data).then(savedId => {
            if (savedId) {
                form.reset(extractFormValues(transaction!))
                if (argId == 0) {
                    setRedirectId(savedId)
                }
            }
        }).catch(e => {
            form.setError('submit', '', e.toString())
        })
    }

    if (redirectId > 0 && redirectId != argId) {
        return <Redirect to={`/sales/${redirectId}`} />
    }
    else if (transaction && revenueOptions && assetOptions && customerOptions) {
        return <div>
            <h1>{transaction.id ? `Sale ${transaction.id}` : 'New sale'}</h1>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='actorId'>Customer:</label>
                    <select name='actorId' ref={form.register(PositiveAmount)}>
                        {customerOptions}
                    </select>
                    {form.errors.actorId && form.errors.actorId.message}
                </div><div>
                    <label htmlFor='date'>Date:</label>
                    <Controller
                        // No-op for DatePicker.onChange()
                        as={<DatePicker onChange={() => {}} />}
                        control={form.control}
                        register={form.register()}
                        name='date'
                        valueName='selected'
                        onChange={([selected]) => {
                            return selected
                        }}
                        rules={{required: 'Date is required'}}
                    />
                    {form.errors.date && form.errors.date.message}
                </div><div>
                    <label htmlFor='description'>Description:</label>
                    <input name='description' ref={form.register} />
                </div><div>
                    <table><thead>
                        <tr><th>
                            Revenue type
                        </th><th>
                            Description
                        </th><th>
                            Amount
                        </th></tr>
                    </thead><tbody>
                    {fields.map((item, index) =>
                        <tr key={item.id}><td>
                            {!!item.eId && 
                            <input type='hidden' name={`elements[${index}].eId`} value={item.eId} ref={form.register()} />}
                            <select
                                name={`elements[${index}].accountId`}
                                defaultValue={item.accountId}
                                ref={form.register()}>
                                {revenueOptions}
                            </select>
                        </td><td>
                            <input
                                name={`elements[${index}].description`}
                                defaultValue={item.description}
                                ref={form.register()}
                            />
                        </td><td>
                            <input
                                name={`elements[${index}].amount`}
                                defaultValue={item.amount}
                                ref={form.register(PositiveAmount)}
                            />
                            {form.errors.elements && form.errors.elements[index] &&
                                form.errors.elements[index].amount &&
                                <div>{form.errors.elements[index].amount!.message}</div>}
                        </td></tr>
                    )}
                    </tbody></table>
                </div><div>
                    <button type='button' onClick={() => append({name: 'elements'})}>
                        More rows
                    </button>
                </div><div>
                    <label htmlFor='accountId'>Move funds to:</label>
                    <select name='accountId' ref={form.register}>
                        {assetOptions}
                    </select>
                </div><div>
                    {form.errors.submit && form.errors.submit.message}
                </div><div>
                    <input type='submit' value={argId ? 'Save' : 'Create'} />
                </div>
            </form>
        </div>
    }

    return null
}

function extractFormValues(t: Transaction): FormData {
    const values: FormData = {
        date: parseISO(t.date!),
        description: t.description,
        actorId: t.actorId!,
        elements: [],
        accountId: t.getFirstDrElement()!.accountId!,
    }

    if (t.elements) {
        for (let e of t.elements) {
            if (e.drcr == Transaction.Credit) {
                // Only populate credit elements
                values.elements.push({
                    eId: e.id,
                    accountId: e.accountId!,
                    amount: `${e.amount}`,
                    description: e.description,
                })
            }
        }
    }

    return values
}

// Returns: id of the transaction that was saved/created, 0 otherwise
async function saveFormData(form: FCV<FormData>, transaction: Transaction, data: FormData): Promise<number> {
    if (!data.actorId) {
        form.setError('actorId', '', 'Customer is required')
        return 0
    }

    const sum = data.elements.reduce((acc, e) => {
        return acc + Number(e.amount)
    }, 0)

    if (!transaction.id && sum == 0) {
        // Don't allow creating if zero 
        return Promise.reject('At least one amount is required')
    } 

    Object.assign(transaction, {
        description: data.description,
        type: Transaction.Sale,
        date: toDateOnly(data.date),
        actorId: data.actorId,
    })

    // Convert form data to elements
    const elements = data.elements.map(e0 => {
        const e1 = e0.eId ? {id: Number(e0.eId)} : {}
        return {
            ...e1,
            accountId: Number(e0.accountId),
            drcr: Transaction.Credit,
            amount: Number(e0.amount),
            description: e0.description,
        }
    })

    // Add a balancing entry
    const drId = transaction.getFirstDrElementId()
    const dr = drId ? {id: drId} : {}
    elements.push({
        ...dr,
        accountId: data.accountId,
        drcr: Transaction.Debit,
        amount: sum,
        description: '',
    })

    // Merge and save.
    await transaction.mergeElements(elements)
    await transaction.save()
    transaction.condenseElements()

    return transaction.id!
}
