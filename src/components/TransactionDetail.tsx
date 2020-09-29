/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Controller, useForm, useFieldArray, FormContextValues as FCV } from 'react-hook-form'
import { Link, Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { TransactionOrKnex, Model,
    Project, Transaction, Account, Actor, IElement,
    dateFormatString as dfs, toDateOnly, parseISO, lastSavedDate,
    toFormatted, parseFormatted } from '../core'
import { validateElementDrCr } from '../util/util'
import { playSuccess, playAlert } from '../util/sound'
import { MaybeSelect, accountSelectOptions, actorSelectOptions, currencySelectOptions } from './SelectOptions'

type Props = {
    arg1?: string
}

type FormData = {
    actorId?: number
    actorTitle?: string
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
    const [actorTitleEnable, setActorTitleEnable] = React.useState<boolean>(false)
    const [accountOptions, setAccountOptions] = React.useState<{}>()
    const [redirectId, setRedirectId] = React.useState<number>(-1)

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'elements'})

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(-1)

        // Load account select list
        Account.query().select()
        .orderBy('title')
        .then(rows => {
            setAccountOptions(accountSelectOptions(rows))
        })

        // Load actor select list
        Actor.query().select()
        .orderBy('title')
        .then((rows: any[]) => {
            rows.push({id: Actor.NewCustomer, title: '<new customer>', type: Actor.Customer})
            rows.push({id: Actor.NewSupplier, title: '<new supplier>', type: Actor.Supplier})
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
                date: lastSavedDate(),
                elements: [{currency}, {currency}],
            })
        }
    }, [props.arg1, transaction && transaction.id && transaction.updatedAt ? transaction.updatedAt.toString() : 0])

    const onSubmit = (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        Model.transaction(trx => saveFormData(transaction!, data, trx)).then(savedId => {
            if (savedId) {
                playSuccess()
                form.reset(extractFormValues(transaction!))
                setActorTitleEnable(false)
                if (argId != savedId) {
                    setRedirectId(savedId)
                }
            }
        }).catch(e => {
            playAlert()
            form.setError('submit', '', e.toString())
        })
    }

    if (redirectId >= 0 && redirectId != argId) {
        return <Redirect to={`/transactions/${redirectId ? redirectId : 'new'}`} />
    }
    else if (transaction && accountOptions && actorOptions) {
        return <div>
            <h1>
                <span className='breadcrumb'>
                    <Link to='/transactions'>Journal</Link> » </span>
                <span className='title'>
                    {transaction.id ? `Raw journal entry ${transaction.id}` : 'New raw journal entry'}
                </span>
            </h1>
            <form onSubmit={form.handleSubmit(onSubmit)} className='transaction-form'>
                <table className='horizontal-table-form transaction-fields'><tbody>{!!transaction.id && <tr className='row row-type'>
                    <th scope='row'>
                        <label htmlFor='type'>Type:</label>
                    </th><td>
                        {transaction.type}
                    </td>
                </tr>}<tr className='row row-actor'>
                    <th scope='row'>
                        <label htmlFor='actorId'>Customer or Supplier:</label>
                    </th><td>
                        <select name='actorId'
                            onChange={e => {
                                const value = Number(e.target.value)
                                setActorTitleEnable(value == Actor.NewCustomer || value == Actor.NewSupplier)
                            }}
                            ref={form.register}>
                            {actorOptions}
                        </select>

                        {actorTitleEnable && <span className='actor-title'>
                            <label htmlFor='actorTitle'>Name:</label>
                            <input name='actorTitle' ref={form.register} />
                            {form.errors.actorTitle && <span className='error'>
                                    {form.errors.actorTitle.message}
                                </span>}
                        </span>}
                    </td>
                </tr><tr className='row row-date'>
                    <th scope='row'>
                        <label htmlFor='date'>Date:</label>
                    </th><td>
                        <Controller
                            // No-op for DatePicker.onChange()
                            as={<DatePicker dateFormat={dfs()} onChange={() => {}} />}
                            control={form.control}
                            register={form.register()}
                            name='date'
                            valueName='selected'
                            onChange={([selected]) => selected}
                            />
                        {form.errors.date && <span className='error'>
                            {form.errors.date.message}
                        </span>}
                    </td>
                </tr><tr className='row row-description'>
                    <th scope='row'>
                        <label htmlFor='description'>Description:</label>
                    </th><td>
                        <input name='description' ref={form.register} />
                    </td>
                </tr></tbody></table>
                <table className='transaction-elements'><thead><tr>
                    <th>
                        Account
                    </th><th>
                        Description
                    </th><th>
                        Currency
                    </th><th>
                        Debit
                    </th><th>
                        Credit
                    </th>
                </tr></thead><tbody>
                {fields.map((item, index) =>
                    <tr className={`element element-${index}`} key={item.id}><td className='account'>
                        {!!item.eId && 
                        <input type='hidden' name={`elements[${index}].eId`} value={item.eId} ref={form.register()} />}
                        <select
                            name={`elements[${index}].accountId`}
                            defaultValue={item.accountId}
                            ref={form.register()}>
                            {accountOptions}
                        </select>
                    </td><td className='description'>
                        <input
                            name={`elements[${index}].description`}
                            defaultValue={item.description}
                            ref={form.register()}
                        />
                    </td><td className='currency'>
                        <MaybeSelect
                            name={`elements[${index}].currency`}
                            defaultValue={item.currency}
                            forwardRef={form.register()}>
                            {currencySelectOptions(item.currency)}
                        </MaybeSelect>
                    </td><td className='debit'>
                        <input
                            name={`elements[${index}].dr`}
                            defaultValue={item.dr}
                            ref={form.register()}
                        />
                        {form.errors.elements && form.errors.elements[index] &&
                            (form.errors.elements[index] as any).dr &&
                            <div className='error'>{(form.errors.elements[index] as any).dr.message}</div>}
                    </td><td className='credit'>
                        <input
                            name={`elements[${index}].cr`}
                            defaultValue={item.cr}
                            ref={form.register()}
                        />
                        {form.errors.elements && form.errors.elements[index] &&
                            (form.errors.elements[index] as any).cr &&
                            <div className='error'>{(form.errors.elements[index] as any).cr.message}</div>}
                    </td></tr>
                )}
                </tbody></table>
                <div className='more'>
                    <button type='button' onClick={() => append({name: 'elements'})}>
                        More rows
                    </button>
                </div><div className='error'>
                    {form.errors.submit && <span className='error'>{form.errors.submit.message}</span>}
                </div><div className='buttons'>
                    <input
                        type='submit'
                        value='Save'
                        disabled={!!transaction.type && transaction.type != Transaction.Raw}
                    />
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
        actorTitle: '',
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
    if ((data.actorId == Actor.NewCustomer || data.actorId == Actor.NewSupplier) && !data.actorTitle) {
        form.setError('actorTitle', '', 'Name is required')
        return false
    }
    if (!data.date) {
        form.setError('date', '', 'Date is required')
        return false
    }
    if (!validateElementDrCr(form, data)) {
        return false
    }
    if (!data.elements || data.elements.length == 0) {
        form.setError('submit', '', 'Nothing to save')
        return false
    }

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
        return false
    }
    return true
}

// Returns: id of the transaction that was saved/created, 0 otherwise
async function saveFormData(transaction: Transaction, data: FormData, trx?: TransactionOrKnex): Promise<number> {
    if (data.actorId == Actor.NewCustomer || data.actorId == Actor.NewSupplier) {
        const actor = Actor.construct({
            title: data.actorTitle!.trim(),
            type: data.actorId == Actor.NewCustomer ? Actor.Customer : Actor.Supplier,
        })
        await actor.save(trx)
        data.actorId = actor.id
    }

    Object.assign(transaction, {
        description: data.description,
        type: Transaction.Raw,
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
    await transaction.save(trx)
    transaction.condenseElements()

    return transaction.id!
}
