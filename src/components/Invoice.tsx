import * as React from 'react'
import { Controller, useForm, useFieldArray, ArrayField, FormContextValues as FCV } from 'react-hook-form'
import { Link, Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { TransactionOrKnex, Model,
    Project, Transaction, Account, Actor, IElement,
    dateFormatString as dfs, toDateOnly, parseISO, lastSavedDate,
    toFormatted, parseFormatted, taxCodeInfo, taxRate, taxCodeWithRate } from '../core'
import { validateElementAmounts, validateElementTaxAmounts } from '../util/util'
import { playSuccess, playAlert } from '../util/sound'
import { MaybeSelect, flatSelectOptions, currencySelectOptions, taxSelectOptions } from './SelectOptions'
import { formCalculateTaxes } from './form'
import InvoicePayment from './InvoicePayment'

type Props = {
    arg1?: string
}

export type FormData = {
    actorId: number
    actorTitle?: string
    date: Date
    description?: string
    elements: {
        // `.id` is used by the form system so we have eId to store 'our' id
        eId?: number
        accountId: number
        amount: string
        currency: string
        useGross: number
        grossAmount: string
        description?: string
        taxes?: {
            eId?: number
            description?: string
            code: string
            rate: string
            amount: string
        }[]
    }[]
    submit?: string    // Only for displaying general submit error messages
}

export default function Invoice(props: Props) {
    // argId == 0 means creating a new transaction
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [transaction, setTransaction] = React.useState<Transaction>()
    const [revenueOptions, setRevenueOptions] = React.useState<{}>()
    const [customerOptions, setCustomerOptions] = React.useState<{}>()
    const [actorTitleEnable, setActorTitleEnable] = React.useState<boolean>(false)
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'elements'})

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load revenue
        Account.query().select()
        .whereIn('type', Account.TypeGroupInfo[Account.Revenue].types)
        .orderBy(['title'])
        .then((rows) => {
            setRevenueOptions(flatSelectOptions(rows))
        })

        // Load customers
        Actor.query().select()
        .where('type', Actor.Customer)
        .orderBy('title')
        .then((rows: any[]) => {
            rows.push({id: Actor.NewCustomer, title: '<new customer>', type: Actor.Customer})
            setCustomerOptions(flatSelectOptions(rows))
        })
        
        // Load transaction (if exists) and initialise form accordingly
        if (argId > 0) {
            Transaction.query().findById(argId).where('type', Transaction.Invoice)
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
            const currency = Project.variables.get('currency')
            form.reset({
                actorId: 0,
                date: lastSavedDate(),
                elements: [{currency}, {currency}],
            })
        }
    }, [props.arg1, transaction && transaction.id ? transaction.updatedAt : 0])

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
        return <Redirect to={`/invoices/${redirectId}`} />
    }
    else if (transaction && revenueOptions && customerOptions) {
        const invoiceForm = <div>
            <h1>
                <span className='breadcrumb'>
                    <Link to='/sales'>Sales</Link> » </span>
                <span className='title'>
                    {transaction.id ? `Invoice ${transaction.id}` : 'New invoice'}
                </span>
            </h1>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='actorId'>Customer:</label>
                    <select
                        name='actorId'
                        onChange={e => {
                            const value = Number(e.target.value)
                            setActorTitleEnable(value == Actor.NewCustomer)
                        }}
                        ref={form.register}>
                        {customerOptions}
                    </select>
                    {form.errors.actorId && form.errors.actorId.message}

                    {actorTitleEnable && <>
                        <label htmlFor='actorTitle'>Name:</label>
                        <input name='actorTitle' ref={form.register} />
                        {form.errors.actorTitle && form.errors.actorTitle.message}
                    </>}
                </div><div>
                    <label htmlFor='date'>Date:</label>
                    <Controller
                        // No-op for DatePicker.onChange()
                        as={<DatePicker dateFormat={dfs()} onChange={() => {}} />}
                        control={form.control}
                        register={form.register()}
                        name='date'
                        valueName='selected'
                        onChange={([selected]) => selected}
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
                        </th><th colSpan={3}>
                            Amount
                        </th><th>
                            &nbsp;
                        </th></tr>
                        <tr><th colSpan={3}>
                            &nbsp;
                        </th><th>
                            Gross
                        </th><th>
                            Net
                        </th><th>
                            &nbsp;
                        </th></tr>
                    </thead><tbody>
                    {fields.map((item, index) =>
                        <ElementFamily
                            key={item.id}
                            currency={fields[0].currency}
                            {...{form, item, index, revenueOptions}}
                        />
                    )}
                    </tbody></table>
                </div><div>
                    <button type='button' onClick={() => append({name: 'elements'})}>
                        More rows
                    </button>
                </div><div>
                    {form.errors.submit && form.errors.submit.message}
                </div><div>
                    <input type='submit' value={argId ? 'Save' : 'Create'} />
                </div>
            </form>
        </div>

        return <div>
            {invoiceForm}
            {!!transaction.id &&
            transaction.elements && transaction.elements.length > 0 &&
            <InvoicePayment transaction={transaction} />}
        </div>
    }

    return null
}

type ElementFamilyProps = {
    form: FCV<FormData>
    item: Partial<ArrayField<Record<string, any>, "id">>
    index: number
    currency: string
    revenueOptions: {}
}

function ElementFamily(props: ElementFamilyProps) {
    const {form, item, index, revenueOptions} = props
    const {fields, append} = useFieldArray({control: form.control, name: `elements[${index}].taxes`})

    const [formatted, setFormatted] = React.useState<string>(item.amount)
    const [grossFormatted, setGrossFormatted] = React.useState<string>(item.grossAmount)
    const [useGross, setUseGross] = React.useState<number>(item.useGross ? 1 : 0)
    const [currency, setCurrency] = React.useState<string>(props.currency)
    const [rates, setRates] = React.useState<string[]>(fields.map(subItem => subItem.rate))
    const state = {formatted, setFormatted, grossFormatted, setGrossFormatted, useGross, setUseGross, currency, setCurrency, rates, setRates}
    const [enabled, setEnabled] = React.useState<boolean>(!item.useGross || !item.grossAmount)
    const [grossEnabled, setGrossEnabled] = React.useState<boolean>(item.useGross || !item.amount)
    const [ratesEnabled, setRatesEnabled] = React.useState<boolean[]>(fields.map(subItem => taxCodeInfo(subItem.code).variable))
    const formErrors: any = form.errors

    return <>
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
        {index == 0 ?
        <MaybeSelect
            name={`elements[${index}].currency`}
            defaultValue={item.currency}
            onChange={(e: {target: {value: string}}) => {
                state.currency = e.target.value
                formCalculateTaxes(form, `elements[${index}]`, state, 'currency')
            }}
            forwardRef={form.register()}>
            {currencySelectOptions(item.currency)}
        </MaybeSelect> :
        <input
            type='hidden'
            name={`elements[${index}].currency`}
            value={currency}
            ref={form.register()}
        />}
        <input
            type='hidden'
            name={`elements[${index}].useGross`}
            value={state.useGross}
            ref={form.register()}
        />
    </td><td>
        <input
            name={`elements[${index}].grossAmount`}
            defaultValue={item.grossAmount}
            disabled={!grossEnabled}
            onChange={e => {
                state.grossFormatted = e.target.value
                state.useGross = e.target.value ? 1 : 0
                formCalculateTaxes(form, `elements[${index}]`, state, 'grossAmount')
                setEnabled(e.target.value ? false : true)
            }}
            ref={form.register()}
        />
        {form.errors.elements && form.errors.elements[index] &&
            form.errors.elements[index].grossAmount &&
            <div>{form.errors.elements[index].grossAmount!.message}</div>}
    </td><td>
        <input
            name={`elements[${index}].amount`}
            defaultValue={item.amount}
            disabled={!enabled}
            onChange={e => {
                state.formatted = e.target.value
                formCalculateTaxes(form, `elements[${index}]`, state, 'amount')
                setGrossEnabled(e.target.value ? false : true)
            }}
            ref={form.register()}
        />
        {form.errors.elements && form.errors.elements[index] &&
            form.errors.elements[index].amount &&
            <div>{form.errors.elements[index].amount!.message}</div>}
    </td><td>
        <button type='button' onClick={() => append({name: `elements[${index}].taxes`})}>
            Add tax
        </button>
    </td></tr>

    {fields.length > 0 && <tr key={`${item.id}-taxes`}><th>
        &nbsp;
    </th><th>
        description
    </th><th>
        tax
    </th><th>
        tax rate
    </th><th>
        amount
    </th><th>
        &nbsp;
    </th></tr>}

    {fields.map((subItem, subIndex) => 
    <tr key={subItem.id}><td>
        {!!subItem.eId && 
        <input
            type='hidden'
            name={`elements[${index}].taxes[${subIndex}].eId`}
            value={subItem.eId}
            ref={form.register()}
        />}
    </td><td>
        <input
            name={`elements[${index}].taxes[${subIndex}].description`}
            defaultValue={subItem.description}
            ref={form.register()}
        />
    </td><td>
        <select
            name={`elements[${index}].taxes[${subIndex}].code`}
            defaultValue={subItem.code}
            onChange={e => {
                const info = taxCodeInfo(e.target.value)
                form.setValue(`elements[${index}].taxes[${subIndex}].rate`, info.rate)
                state.rates[subIndex] = info.rate
                formCalculateTaxes(form, `elements[${index}]`, state, 'rates')

                ratesEnabled[subIndex] = info.variable
                setRatesEnabled([...ratesEnabled])
            }}
            ref={form.register()}
            style={{width: '100px'}}>
            {taxSelectOptions(subItem.code)}
        </select>
    </td><td>
        <input
            name={`elements[${index}].taxes[${subIndex}].rate`}
            defaultValue={subItem.rate}
            onChange={e => {
                state.rates[subIndex] = e.target.value
                formCalculateTaxes(form, `elements[${index}]`, state, 'rates')
            }}
            disabled={!ratesEnabled[subIndex]}
            ref={form.register()}
        />
        <label htmlFor={`elements[${index}].taxes[${subIndex}].rate`}>%</label>
    </td><td>
        <input
            name={`elements[${index}].taxes[${subIndex}].amount`}
            defaultValue={subItem.amount}
            disabled={true}
            ref={form.register()}
        />
        {formErrors.elements && formErrors.elements[index] &&
            formErrors.elements[index].taxes && formErrors.elements[index].taxes[subIndex] &&
            formErrors.elements[index].taxes[subIndex].amount &&
            <div>{formErrors.elements[index].taxes[subIndex].amount.message}</div>}
    </td><td>
        &nbsp;
    </td></tr>
    )}
    </>
}

export function extractFormValues(t: Transaction): FormData {
    const values: FormData = {
        date: parseISO(t.date!),
        description: t.description,
        actorId: t.actorId!,
        actorTitle: '',
        elements: [],
    }

    if (t.elements) {
        const children = []
        for (let e of t.elements) {
            if (e.drcr == Transaction.Credit) {
                // Only populate credit elements
                if (e.parentId == 0) {
                    values.elements.push({
                        eId: e.id,
                        accountId: e.accountId!,
                        amount: toFormatted(e.amount!, e.currency!),
                        currency: e.currency!,
                        useGross: e.useGross!,
                        grossAmount: toFormatted(e.grossAmount!, e.currency!),
                        description: e.description,
                        taxes: [],
                    })
                }
                else {
                    children.push(e)
                }
            }
        }

        // Now populate child elements. Any orphans are promoted.
        for (let e of children) {
            let orphan = true
            for (let p of values.elements) {
                if (e.parentId == p.eId) {
                    p.taxes!.push({
                        eId: e.id,
                        description: e.description,
                        code: e.taxCode!,
                        rate: taxRate(e.taxCode!),
                        amount: toFormatted(e.amount!, e.currency!),
                    })

                    orphan = false
                    break
                }
            }

            if (orphan) {
                values.elements.push({
                    eId: e.id,
                    accountId: e.accountId!,
                    amount: toFormatted(e.amount!, e.currency!),
                    currency: e.currency!,
                    useGross: e.useGross!,
                    grossAmount: toFormatted(e.grossAmount!, e.currency!),
                    description: e.description,
                })
            }
        }
    }

    return values
}

// Returns true if validation succeeded, false otherwise
export function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!data.actorId) {
        form.setError('actorId', '', 'Customer is required')
        return false
    }
    if (data.actorId == Actor.NewCustomer && !data.actorTitle) {
        form.setError('actorTitle', '', 'Name is required')
        return false
    }
    if (!data.date) {
        form.setError('date', '', 'Date is required')
        return false
    }
    if (!data.elements || data.elements.length == 0) {
        form.setError('submit', '', 'Nothing to save')
        return false
    }
    return validateElementAmounts(form, data) && validateElementTaxAmounts(form, data)
}

// Returns: id of the transaction that was saved/created, 0 otherwise
export async function saveFormData(transaction: Transaction, data: FormData, trx?: TransactionOrKnex): Promise<number> {
    if (data.actorId == Actor.NewCustomer) {
        const actor = Actor.construct({title: data.actorTitle!.trim(), type: Actor.Customer})
        await actor.save(trx)
        data.actorId = actor.id!
    }

    Object.assign(transaction, {
        description: data.description,
        type: Transaction.Invoice,
        date: toDateOnly(data.date),
        actorId: data.actorId,
    })

    // Convert form data to elements
    const elements: IElement[] = []
    data.elements.forEach(e0 => {
        elements.push({
            id: e0.eId ? Number(e0.eId) : undefined,
            accountId: Number(e0.accountId),
            drcr: Transaction.Credit,
            // Note: Use the currency value of the first item
            amount: parseFormatted(e0.amount, data.elements[0].currency),
            currency: data.elements[0].currency,
            useGross: e0.useGross,
            grossAmount: parseFormatted(e0.grossAmount, data.elements[0].currency),
            description: e0.description,
            settleId: 0,
            taxCode: '',
        })

        if (e0.taxes) {
            e0.taxes.forEach(sub => {
                elements.push({
                    id: sub.eId ? Number(sub.eId) : undefined,
                    accountId: Account.Reserved.TaxPayable,
                    drcr: Transaction.Credit,
                    // Note: Use the currency value of the first item
                    amount: parseFormatted(sub.amount, data.elements[0].currency),
                    currency: data.elements[0].currency,
                    useGross: 0,
                    grossAmount: 0,
                    description: sub.description,
                    settleId: 0,
                    taxCode: (sub.code != '' || Number(sub.rate)) ?
                        taxCodeWithRate(sub.code, sub.rate) : '',
                    parentId: -1,
                })
            })
        }
    })

    // Generate balancing elements. Try to re-use IDs if available
    const sums = Transaction.getSums(elements)
    const ids = transaction.getDrElementIds()

    for (let currency in sums) {
        elements.push({
            id: ids.shift(),
            accountId: Account.Reserved.AccountsReceivable,
            drcr: Transaction.Debit,
            amount: sums[currency],
            currency: currency,
            useGross: 0,
            grossAmount: 0,
            description: '',
            settleId: 0,
            taxCode: '',
        })
    }

    // If there are any remaining old IDs/elements, zero them out
    for (let id of ids) {
        elements.push({
            id: id,
            drcr: Transaction.Debit,
            amount: 0,
            currency: '',
        })
    }

    // Merge and save.
    await transaction.mergeElements(elements)
    await transaction.save(trx)
    transaction.condenseElements()

    return transaction.id!
}
