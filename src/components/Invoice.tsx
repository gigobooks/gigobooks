import * as React from 'react'
import { Controller, useForm, useFieldArray, ArrayField, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { Project, Transaction, Account, Actor, IElement, 
    toFormatted, parseFormatted, taxRate, taxCodeWithRate, calculateTaxes } from '../core'
import { toDateOnly, validateElementAmounts, validateElementTaxAmounts } from '../util/util'
import { parseISO } from 'date-fns'
import { MaybeSelect, flatSelectOptions, currencySelectOptions, taxSelectOptions } from './SelectOptions'
import InvoicePayment from './InvoicePayment'

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
        .then(rows => {
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
                date: new Date(),
                elements: [{currency}, {currency}],
            })
        }
    }, [props.arg1])

    const onSubmit = (data: FormData) => {
        if (!validateFormData(form, data)) {
            return
        }

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
        return <Redirect to={`/invoices/${redirectId}`} />
    }
    else if (transaction && revenueOptions && customerOptions) {
        const invoiceForm = <div>
            <h1>{transaction.id ? `Invoice ${transaction.id}` : 'New invoice'}</h1>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='actorId'>Customer:</label>
                    <select name='actorId' ref={form.register}>
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
            {!!transaction.id && <InvoicePayment transaction={transaction} />}
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

type ElementFamilyState = {
    formatted: string
    grossFormatted: string
    useGross: number
    currency: string
    rates: string[]
}

function ElementFamily(props: ElementFamilyProps) {
    const {form, item, index, revenueOptions} = props
    const {fields, append} = useFieldArray({control: form.control, name: `elements[${index}].taxes`})

    const [formatted, setFormatted] = React.useState<string>(item.amount)
    const [grossFormatted, setGrossFormatted] = React.useState<string>(item.grossAmount)
    const [useGross, setUseGross] = React.useState<number>(item.useGross ? 1 : 0)
    const [currency, setCurrency] = React.useState<string>(props.currency)
    const [rates, setRates] = React.useState<string[]>(fields.map(subItem => subItem.rate))
    const state: ElementFamilyState = {formatted, grossFormatted, useGross, currency, rates}

    const [enabled, setEnabled] = React.useState<boolean>(!item.useGross || !item.grossAmount)
    const [grossEnabled, setGrossEnabled] = React.useState<boolean>(item.useGross || !item.amount)
    const formErrors: any = form.errors

    function recalculate(source: string) {
        let inFormatted, outField, inAmount: number

        if (source == 'amount') {
            inFormatted = state.formatted
            outField = 'grossAmount'
        }
        else if (source == 'grossAmount') {
            inFormatted = state.grossFormatted
            outField = 'amount'
        }
        else {
            inFormatted = state.useGross ? state.grossFormatted : state.formatted
            outField = state.useGross ? 'amount' : 'grossAmount'
        }

        if (inFormatted != undefined && inFormatted != '') {
            // Validate amount/grossAmount.
            let valid = true
            try {
                inAmount = parseFormatted(inFormatted, state.currency)
            }
            catch (e) {
                valid = false
            }

            if (valid) {
                const outputs = calculateTaxes({
                    amount: inAmount!,
                    useGross: state.useGross,
                    rates: state.rates,
                })

                form.setValue(`elements[${index}].${outField}`, toFormatted(outputs.amount, state.currency))
                for (let i in fields) {
                    form.setValue(`elements[${index}].taxes[${i}].amount`, 
                        (state.rates[i] != '' && outputs.taxes[i] != undefined) ?
                        toFormatted(outputs.taxes[i], state.currency) : '')
                }
            }
        }
        else {
            form.setValue(`elements[${index}].${outField}`, '')
            for (let i in fields) {
                form.setValue(`elements[${index}].taxes[${i}].amount`, '')
            }
        }

        // Set state
        switch (source) {
            case 'currency': setCurrency(state.currency); break
            case 'amount': setFormatted(state.formatted); break
            case 'grossAmount':
                setGrossFormatted(state.grossFormatted);
                setUseGross(state.useGross);
                break
            case 'rates': setRates(state.rates); break
        }
    }

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
                recalculate('currency')
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
                recalculate('grossAmount')
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
                recalculate('amount')
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
                const rate = taxRate(e.target.value)
                form.setValue(`elements[${index}].taxes[${subIndex}].rate`, rate)
                state.rates[subIndex] = rate
                recalculate('rates')
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
                recalculate('rates')
            }}
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

function extractFormValues(t: Transaction): FormData {
    const values: FormData = {
        date: parseISO(t.date!),
        description: t.description,
        actorId: t.actorId!,
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
function validateFormData(form: FCV<FormData>, data: FormData) {
    let success = true

    if (!data.actorId) {
        form.setError('actorId', '', 'Customer is required')
        success = false
    }
    return success && validateElementAmounts(form, data) && validateElementTaxAmounts(form, data)
}

// Returns: id of the transaction that was saved/created, 0 otherwise
async function saveFormData(form: FCV<FormData>, transaction: Transaction, data: FormData): Promise<number> {
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
        })

        if (e0.taxes) {
            e0.taxes.forEach(sub => {
                if (sub.code != '' && sub.rate != '') {
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
                        taxCode: taxCodeWithRate(sub.code, sub.rate),
                        parentId: -1,
                    })
                }
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
            description: '',
            settleId: 0,
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
    await transaction.save()
    transaction.condenseElements()

    return transaction.id!
}
