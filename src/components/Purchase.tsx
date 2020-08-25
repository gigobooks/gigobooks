/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Controller, useForm, useFieldArray, ArrayField, FormContextValues as FCV } from 'react-hook-form'
import { Link, Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { TransactionOrKnex, Model,
    Project, Transaction, TransactionType, Account, Actor, IElement,
    dateFormatString as dfs, toDateOnly, parseISO, lastSavedDate,
    toFormatted, parseFormatted, TaxCode } from '../core'
import { validateElementAmounts, validateElementTaxAmounts } from '../util/util'
import { playSuccess, playAlert } from '../util/sound'
import { MaybeSelect, hashSelectOptions, flatSelectOptions, accountSelectOptions, currencySelectOptions, taxSelectOptions } from './SelectOptions'
import { formCalculateTaxes } from './form'
import BillPayment from './BillPayment'

type Props = {
    arg1?: string
}

export type FormData = {
    type: TransactionType
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
            baseCode: string
            tag: string
            rate: string
            amount: string
        }[]
    }[]
    submit?: string    // Only for displaying general submit error messages
}

export default function Purchase(props: Props) {
    // argId == 0 means creating a new transaction
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [transaction, setTransaction] = React.useState<Transaction>()
    const [accountOptions, setAccountOptions] = React.useState<{}>()
    const [supplierOptions, setSupplierOptions] = React.useState<{}>()
    const [actorTitleEnable, setActorTitleEnable] = React.useState<boolean>(false)
    const [redirectId, setRedirectId] = React.useState<number>(-1)
    let action = ''

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'elements'})

    function clearForm() {
        const currency = Project.variables.get('currency')
        form.reset({
            actorId: 0,
            date: lastSavedDate(),
            elements: [{currency}],
        })
    }

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(-1)

        // Load expense and asset accounts
        Account.query().select()
        .whereIn('type', [Account.LongTermAsset,
            ...Account.TypeGroupInfo[Account.Expense].types])
        .orderBy(['title'])
        .then(rows => {
            const groupInfo = {
                [Account.Expense]: { label: 'Expense' },
                [Account.Asset]: { label: 'Long term asset' },
            }
            setAccountOptions(accountSelectOptions(rows, groupInfo))
        })

        // Load suppliers
        Actor.query().select()
        .where('type', Actor.Supplier)
        .orderBy('title')
        .then((rows: any[]) => {
            rows.push({id: Actor.NewSupplier, title: '<new supplier>', type: Actor.Supplier})
            setSupplierOptions(flatSelectOptions(rows))
        })
        
        // Load transaction (if exists) and initialise form accordingly
        if (argId > 0) {
            Transaction.query().findById(argId).whereIn('type', [Transaction.Purchase, Transaction.Bill])
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
            clearForm()
        }
    }, [props.arg1, transaction && transaction.updatedAt ? transaction.updatedAt.toString() : 0])

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

                if (action == '' && argId != savedId) {
                    setRedirectId(savedId)
                }
                else if (action == 'and-new') {
                    clearForm()
                    if (argId != 0) {
                        setRedirectId(0)
                    }        
                }
            }
        }).catch(e => {
            playAlert()
            form.setError('submit', '', e.toString())
        })
    }

    if (redirectId >= 0 && redirectId != argId) {
        return <Redirect to={`/purchases/${redirectId ? redirectId : 'new'}`} />
    }
    else if (transaction && accountOptions && supplierOptions) {
        const purchaseForm = <div>
            <h1>
                <span className='breadcrumb'>
                    <Link to='/purchases'>Purchases</Link> » </span>
                <span className='title'>
                    {transaction.id ? `${Transaction.TypeInfo[transaction.type!].label} ${transaction.id}` : 'New purchase'}
                </span>
            </h1>
            <form onSubmit={form.handleSubmit(onSubmit)} className='transaction-form'>
                <table className='horizontal-table-form transaction-fields'><tbody><tr className='row row-type'>
                    <th scope='row'>
                        <label htmlFor='type'>Type:</label>
                    </th><td>
                        <select name='type' ref={form.register} disabled={!!transaction.id}>
                            <option key={Transaction.Purchase} value={Transaction.Purchase}>
                                {Transaction.TypeInfo[Transaction.Purchase].label}
                            </option>
                            <option key={Transaction.Bill} value={Transaction.Bill}>
                                {Transaction.TypeInfo[Transaction.Bill].label}
                            </option>
                        </select>
                    </td>
                </tr><tr className='row row-actor'>
                    <th scope='row'>
                        <label htmlFor='actorId'>Supplier:</label>
                    </th><td>
                        <select
                            name='actorId'
                            onChange={e => {
                                const value = Number(e.target.value)
                                setActorTitleEnable(value == Actor.NewSupplier)
                            }}
                            ref={form.register}>
                            {supplierOptions}
                        </select>
                        {form.errors.actorId && <span className='error'>
                            {form.errors.actorId.message}
                        </span>}

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
                    <th rowSpan={2}>
                        Account
                    </th><th rowSpan={2} colSpan={3}>
                        Description
                    </th><th scope='colgroup' colSpan={3}>
                        Amount
                    </th><td rowSpan={2}>
                        &nbsp;
                    </td>
                </tr><tr>
                    <th>
                        Currency
                    </th><th>
                        Gross
                    </th><th>
                        Net
                    </th>
                </tr></thead>
                {fields.map((item, index) =>
                    <ElementFamily
                        key={item.id}
                        currency={fields[0].currency}
                        {...{form, item, index, accountOptions}}
                    />
                )}
                </table>
                <div className='more'>
                    <button type='button' onClick={() => append({name: 'elements'})}>
                        More rows
                    </button>
                </div><div className='errors'>
                    {form.errors.submit && <span className='error'>{form.errors.submit.message}</span>}
                </div><div className='buttons'>
                    <input type='submit' value='Save' />
                    <input type='submit' value='Save and new' onClick={() => {
                        action = 'and-new'
                    }} />
                </div>
            </form>
        </div>

        return <div>
            {purchaseForm}
            {!!transaction.id && transaction.type == Transaction.Bill &&
            transaction.elements && transaction.elements.length > 0 &&
            <BillPayment transaction={transaction} />}
        </div>
    }

    return null
}

type ElementFamilyProps = {
    form: FCV<FormData>
    item: Partial<ArrayField<Record<string, any>, "id">>
    index: number
    currency: string
    accountOptions: {}
}

function ElementFamily(props: ElementFamilyProps) {
    const {form, item, index, accountOptions} = props
    const {fields, append} = useFieldArray({control: form.control, name: `elements[${index}].taxes`})

    const [formatted, setFormatted] = React.useState<string>(item.amount)
    const [grossFormatted, setGrossFormatted] = React.useState<string>(item.grossAmount)
    const [useGross, setUseGross] = React.useState<number>(item.useGross ? 1 : 0)
    const [currency, setCurrency] = React.useState<string>(props.currency)
    const [rates, setRates] = React.useState<string[]>(fields.map(subItem => subItem.rate))
    const [baseCodes, setBaseCodes] = React.useState<string[]>(fields.map(subItem => subItem.baseCode))

    const state = {formatted, setFormatted, grossFormatted, setGrossFormatted, useGross, setUseGross, currency, setCurrency, rates, setRates}
    const [enabled, setEnabled] = React.useState<boolean>(!item.useGross || !item.grossAmount)
    const [grossEnabled, setGrossEnabled] = React.useState<boolean>(item.useGross || !item.amount)
    const [ratesEnabled, setRatesEnabled] = React.useState<boolean[]>(fields.map(subItem => new TaxCode(subItem.baseCode).variable))
    const formErrors: any = form.errors

    React.useEffect(() => {
        if (!item.eId && fields.length == 0) {
            append({name: `elements[${index}].taxes`})
        }
    }, [])

    return <tbody className='element-family'>
    <tr className={`element element-${index}`} key={item.id}><td className='account' rowSpan={65534}>
        {!!item.eId && 
        <input type='hidden' name={`elements[${index}].eId`} value={item.eId} ref={form.register()} />}
        <select
            name={`elements[${index}].accountId`}
            defaultValue={item.accountId}
            ref={form.register()}>
            {accountOptions}
        </select>
    </td><td className='description' colSpan={3}>
        <input
            name={`elements[${index}].description`}
            defaultValue={item.description}
            ref={form.register()}
        />
    </td><td className='currency'>
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
    </td><td className='gross-amount'>
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
            <div className='error'>{form.errors.elements[index].grossAmount!.message}</div>}
    </td><td className='amount'>
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
            <div className='error'>{form.errors.elements[index].amount!.message}</div>}
    </td><td className='add-tax' rowSpan={65534}>
        <button type='button' onClick={() => append({name: `elements[${index}].taxes`})}>
            Add tax
        </button>
    </td></tr>

    {fields.map((subItem, subIndex) => {
        const baseCode = baseCodes[subIndex] ? new TaxCode(baseCodes[subIndex]) : undefined
        const tagOptions = baseCode ? baseCode.tagOptions(false) : {}
        const hasTagOptions = Object.keys(tagOptions).length > 0

        return <tr className={`child child-${subIndex}${subIndex == fields.length-1 ? ' child-last' : ''}`} key={subItem.id}>
        <td className='child-tax-code' colSpan={3}>
            {!!subItem.eId && 
            <input
                type='hidden'
                name={`elements[${index}].taxes[${subIndex}].eId`}
                value={subItem.eId}
                ref={form.register()}
            />}
            <label htmlFor={`elements[${index}].taxes[${subIndex}].baseCode`}>Tax:
                <select
                    name={`elements[${index}].taxes[${subIndex}].baseCode`}
                    defaultValue={subItem.baseCode}
                    onChange={e => {
                        const info = new TaxCode(e.target.value)
                        form.setValue(`elements[${index}].taxes[${subIndex}].rate`, info.rate)
                        state.rates[subIndex] = info.rate
                        formCalculateTaxes(form, `elements[${index}]`, state, 'rates')

                        ratesEnabled[subIndex] = info.variable
                        setRatesEnabled([...ratesEnabled])

                        baseCodes[subIndex] = e.target.value
                        setBaseCodes([...baseCodes])
                    }}
                    ref={form.register()}
                >
                    {taxSelectOptions(false, baseCode)}
                </select>
            </label>
            {hasTagOptions && <>&nbsp;</>}
            <label htmlFor={`elements[${index}].taxes[${subIndex}].tag`} style={hasTagOptions ? {} : {display: 'none'}}>Tag:
                <select
                    name={`elements[${index}].taxes[${subIndex}].tag`}
                    defaultValue={subItem.tag}
                    ref={form.register()}
                >
                    <option key='' value=''>None</option>
                    {hashSelectOptions(tagOptions)}
                </select>
            </label>
        </td><td className='child-tax-rate'>
            <label htmlFor={`elements[${index}].taxes[${subIndex}].rate`}>
                Rate:<input
                    name={`elements[${index}].taxes[${subIndex}].rate`}
                    defaultValue={subItem.rate}
                    onChange={e => {
                        state.rates[subIndex] = e.target.value
                        formCalculateTaxes(form, `elements[${index}]`, state, 'rates')
                    }}
                    disabled={!ratesEnabled[subIndex]}
                    ref={form.register()}
                /> %
            </label>
        </td><td className='child-amount' colSpan={2}>
            <label htmlFor={`elements[${index}].taxes[${subIndex}].amount`}>Amount:
                <input
                    name={`elements[${index}].taxes[${subIndex}].amount`}
                    defaultValue={subItem.amount}
                    disabled={true}
                    ref={form.register()}
                />
            </label>
            {formErrors.elements && formErrors.elements[index] &&
                formErrors.elements[index].taxes && formErrors.elements[index].taxes[subIndex] &&
                formErrors.elements[index].taxes[subIndex].amount &&
                <div>{formErrors.elements[index].taxes[subIndex].amount.message}</div>}
        </td></tr>
    })}
    </tbody>
}

export function extractFormValues(t: Transaction): FormData {
    const values: FormData = {
        type: t.type!,
        date: parseISO(t.date!),
        description: t.description,
        actorId: t.actorId!,
        actorTitle: '',
        elements: [],
    }

    if (t.elements) {
        const children = []
        for (let e of t.elements) {
            if (e.drcr == Transaction.Debit) {
                // Only populate debit elements
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
                    const tc = new TaxCode(e.taxCode!)
                    p.taxes!.push({
                        eId: e.id,
                        baseCode: e.taxCode ? tc.baseCode : '',
                        tag: e.taxCode ? tc.tag : '',
                        rate: e.taxCode ? tc.rate : '',
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
        form.setError('actorId', '', 'Supplier is required')
        return false
    }
    if (data.actorId == Actor.NewSupplier && !data.actorTitle) {
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
    if (data.actorId == Actor.NewSupplier) {
        const actor = Actor.construct({title: data.actorTitle!.trim(), type: Actor.Supplier})
        await actor.save(trx)
        data.actorId = actor.id!
    }

    Object.assign(transaction, {
        description: data.description,
        type: data.type,
        date: toDateOnly(data.date),
        actorId: data.actorId,
    })

    // Convert form data to elements
    const elements: IElement[] = []
    data.elements.forEach(e0 => {
        elements.push({
            id: e0.eId ? Number(e0.eId) : undefined,
            accountId: Number(e0.accountId),
            drcr: Transaction.Debit,
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
                let taxCode = ''
                if (sub.baseCode) {
                    const info = new TaxCode(sub.baseCode)
                    if (sub.tag) {
                        info.tag = sub.tag
                    }
                    info.rate = sub.rate
                    taxCode = info.taxCode
                }

                elements.push({
                    id: sub.eId ? Number(sub.eId) : undefined,
                    accountId: Account.Reserved.TaxReceivable,
                    drcr: Transaction.Debit,
                    // Note: Use the currency value of the first item
                    amount: parseFormatted(sub.amount, data.elements[0].currency),
                    currency: data.elements[0].currency,
                    useGross: 0,
                    grossAmount: 0,
                    description: '',
                    settleId: 0,
                    taxCode,
                    parentId: -1,
                })
            })
        }
    })

    // Generate balancing elements. Try to re-use IDs if available
    const sums = Transaction.getSums(elements)
    const ids = transaction.getCrElementIds()

    for (let money of sums) {
        elements.push({
            id: ids.shift(),
            accountId: data.type == Transaction.Purchase ? Account.Reserved.Cash : Account.Reserved.AccountsPayable,
            drcr: Transaction.Credit,
            amount: money.amount,
            currency: money.currency,
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
            drcr: Transaction.Credit,
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
