import * as React from 'react'
import { Controller, useForm, useFieldArray, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { Transaction, Account, Actor } from '../core'
import { toDateOnly, FormHelpers } from '../util/util'
import { parseISO } from 'date-fns'
import { accountSelectOptions, actorSelectOptions } from './SelectOptions'

const PositiveAmount = FormHelpers.Validation.PositiveAmount

type Props = {
    arg1?: string
}

type FormData = {
    actorId?: number
    date: Date
    description?: string
    elements: {
        // `.id` is used by the form system so we use eId instead
        eId?: number
        accountId?: number
        dr?: string
        cr?: string
        description?: string
    }[]
    submit?: string    // Only for displaying general submit error messages
}

export default function TransactionDetail(props: Props) {
    // argId == 0 means creating a new transaction
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [transaction, setTransaction] = React.useState<Transaction>()
    const [actorOptions, setActorOptions] = React.useState<{}>()
    const [accountOptions, setAccountOptions] = React.useState<{}>()
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'elements'})

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load account select list
        Account.query().select()
        .orderBy('title')
        .then((rows: Account[]) => {
            setAccountOptions(accountSelectOptions(rows))
        })

        // Load actor select list
        Actor.query().select()
        .orderBy('title')
        .then((rows: Actor[]) => {
            setActorOptions(actorSelectOptions(rows))
        })

        // Load transaction (if exists) and initialise form accordingly
        if (argId > 0) {
            Transaction.query().findById(argId).withGraphFetched('elements')
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
                elements: [{}, {}]
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
        return <Redirect to={`/transactions/${redirectId}`} />
    }
    else if (transaction && accountOptions && actorOptions) {
        return <div>
            <h1>{transaction.id ? `Transaction ${transaction.id}` : 'New transaction'}</h1>
            {/* !!transaction.type && <div>Type: {transaction.type}</div> */}
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='actorId'>Customer or Supplier:</label>
                    <select name='actorId' ref={form.register}>
                        {actorOptions}
                    </select>
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
                            Account
                        </th><th>
                            Description
                        </th><th>
                            Debit
                        </th><th>
                            Credit
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
                                {accountOptions}
                            </select>
                        </td><td>
                            <input
                                name={`elements[${index}].description`}
                                defaultValue={item.description}
                                ref={form.register()}
                            />
                        </td><td>
                            <input
                                name={`elements[${index}].dr`}
                                defaultValue={item.dr}
                                ref={form.register(PositiveAmount)}
                            />
                            {form.errors.elements && form.errors.elements[index] &&
                                (form.errors.elements[index] as any).dr &&
                                <div>{(form.errors.elements[index] as any).dr.message}</div>}
                        </td><td>
                            <input
                                name={`elements[${index}].cr`}
                                defaultValue={item.cr}
                                ref={form.register(PositiveAmount)}
                            />
                            {form.errors.elements && form.errors.elements[index] &&
                                (form.errors.elements[index] as any).cr &&
                                <div>{(form.errors.elements[index] as any).cr.message}</div>}
                        </td></tr>
                    )}
                    </tbody></table>
                </div><div>
                    <button type='button' onClick={() => append({name: 'elements'})}>
                        More rows
                    </button>
                </div><div>
                    {form.errors.submit && form.errors.submit.message}
                </div><div>
                    <input type='submit' value={argId ? 'Save' : 'Create'} disabled={!!transaction.type} />
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
        actorId: t.actorId,
        elements: [],
    }

    if (t.elements) {
        for (let e of t.elements) {
            values.elements.push({
                eId: e.id,
                accountId: e.accountId,
                [e.drcr == Transaction.Credit ? 'cr' : 'dr']: `${e.amount}`,
                description: e.description,
            })
        }
    }

    return values
}

// Returns: id of the transaction that was saved/created, 0 otherwise
async function saveFormData(form: FCV<FormData>, transaction: Transaction, data: FormData): Promise<number> {
    const balance = data.elements.reduce((acc, e) => {
        return acc + Number(e.dr) - Number(e.cr)
    }, 0)

    if (balance != 0) {
        return Promise.reject('Entries do not balance')
    }

    Object.assign(transaction, {
        description: data.description,
        type: '',
        date: toDateOnly(data.date),
        actorId: data.actorId,
    })

    // Convert form data to elements
    const elements = data.elements.map(e0 => {
        const e1 = e0.eId ? {id: Number(e0.eId)} : {}
        const amount = Number(e0.dr) - Number(e0.cr)
        const drcr = amount > 0 ? Transaction.Debit : Transaction.Credit
        return {
            ...e1,
            accountId: Number(e0.accountId),
            drcr,
            amount: amount > 0 ? amount : -amount,
            description: e0.description,
        }
    })

    // Merge and save.
    await transaction.mergeElements(elements)
    await transaction.save()
    transaction.condenseElements()

    return transaction.id!
}
