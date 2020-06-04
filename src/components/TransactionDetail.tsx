import * as React from 'react'
import { Controller, useForm, useFieldArray, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { Project, Transaction, Account, Actor, IElement,
    dateFormatString as dfs, toDateOnly, parseISO,
    toFormatted, parseFormatted } from '../core'
import { validateElementDrCr } from '../util/util'
import { playSuccess, playAlert } from '../util/sound'
import { MaybeSelect, accountSelectOptions, actorSelectOptions, currencySelectOptions } from './SelectOptions'

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
        currency: string
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
        .then(rows => {
            setAccountOptions(accountSelectOptions(rows))
        })

        // Load actor select list
        Actor.query().select()
        .orderBy('title')
        .then(rows => {
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
            const currency = Project.variables.get('currency')
            form.reset({
                actorId: 0,
                date: new Date(),
                elements: [{currency}, {currency}],
            })
        }
    }, [props.arg1])

    const onSubmit = (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        saveFormData(form, transaction!, data).then(savedId => {
            if (savedId) {
                playSuccess()
                form.reset(extractFormValues(transaction!))
                if (argId == 0) {
                    setRedirectId(savedId)
                }
            }
        }).catch(e => {
            playAlert()
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
                        as={<DatePicker dateFormat={dfs()} onChange={() => {}} />}
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
                        </th><th>
                            Currency
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
                                ref={form.register()}
                            />
                            {form.errors.elements && form.errors.elements[index] &&
                                (form.errors.elements[index] as any).dr &&
                                <div>{(form.errors.elements[index] as any).dr.message}</div>}
                        </td><td>
                            <input
                                name={`elements[${index}].cr`}
                                defaultValue={item.cr}
                                ref={form.register()}
                            />
                            {form.errors.elements && form.errors.elements[index] &&
                                (form.errors.elements[index] as any).cr &&
                                <div>{(form.errors.elements[index] as any).cr.message}</div>}
                        </td><td>
                            <MaybeSelect
                                name={`elements[${index}].currency`}
                                defaultValue={item.currency}
                                forwardRef={form.register()}>
                                {currencySelectOptions(item.currency)}
                            </MaybeSelect>
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
            const formatted = toFormatted(e.amount!, e.currency!)
            values.elements.push({
                eId: e.id,
                accountId: e.accountId,
                [e.drcr == Transaction.Credit ? 'cr' : 'dr']: formatted,
                currency: e.currency!,
                description: e.description,
            })
        }
    }

    return values
}

// Returns true if validation succeeded, false otherwise
function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!validateElementDrCr(form, data)) {
        return false
    }

    let success = true
    const balances: Record<string, number> = {}

    data.elements.forEach(e => {
        const currency = e.currency!
        if (balances[currency] == undefined) {
            balances[currency] = 0
        }
        balances[currency] += parseFormatted(e.dr, currency) - parseFormatted(e.cr, currency)
    })

    if (Object.keys(balances).some(currency => balances[currency] != 0)) {
        form.setError('submit', '', 'Entries do not balance')
        success = false
    }

    return success
}

// Returns: id of the transaction that was saved/created, 0 otherwise
async function saveFormData(form: FCV<FormData>, transaction: Transaction, data: FormData): Promise<number> {
    Object.assign(transaction, {
        description: data.description,
        type: '',
        date: toDateOnly(data.date),
        actorId: data.actorId,
    })

    // Convert form data to elements
    const elements: IElement[] = data.elements.map(e0 => {
        const amount = parseFormatted(e0.dr, e0.currency) - parseFormatted(e0.cr, e0.currency)
        const drcr = amount > 0 ? Transaction.Debit : Transaction.Credit
        return {
            id: e0.eId ? Number(e0.eId) : undefined,
            accountId: Number(e0.accountId),
            drcr,
            amount: amount > 0 ? amount : -amount,
            currency: e0.currency,
            description: e0.description,
            settleId: 0,
        }
    })

    // Merge and save.
    await transaction.mergeElements(elements)
    await transaction.save()
    transaction.condenseElements()

    return transaction.id!
}
