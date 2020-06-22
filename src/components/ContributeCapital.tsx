import * as React from 'react'
import { Controller, useForm, useFieldArray, ArrayField, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import { TransactionOrKnex, Model,
    Project, Transaction, Account, IElement,
    dateFormatString as dfs, toDateOnly, parseISO, lastSavedDate,
    toFormatted, parseFormatted } from '../core'
import { validateElementAmounts } from '../util/util'
import { playSuccess, playAlert } from '../util/sound'
import { MaybeSelect, flatSelectOptions, currencySelectOptions } from './SelectOptions'

type Props = {
    arg1?: string
}

type FormData = {
    date: Date
    description?: string
    elements: {
        // `.id` is used by the form system so we have eId to store 'our' id
        eId?: number
        accountId: number
        amount: string
        currency: string
        description?: string
    }[]
    submit?: string    // Only for displaying general submit error messages
}

export default function ContributeCapital(props: Props) {
    // argId == 0 means creating a new transaction
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [transaction, setTransaction] = React.useState<Transaction>()
    const [assetOptions, setAssetOptions] = React.useState<{}>()
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'elements'})

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load asset accounts
        Account.query().select()
        .whereIn('type', [Account.Asset, Account.LongTermAsset])
        .whereNotIn('id', [Account.Reserved.AccountsReceivable, Account.Reserved.TaxReceivable])
        .orderBy(['type', 'title'])
        .then(rows => {
            setAssetOptions(flatSelectOptions(rows))
        })

        // Load transaction (if exists) and initialise form accordingly
        if (argId > 0) {
            Transaction.query().findById(argId).where('type', Transaction.Contribution).withGraphFetched('elements')
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
        return <Redirect to={`/contributions/${redirectId}`} />
    }
    else if (transaction && assetOptions) {
        return <div>
            <h1>{transaction.id ? `Contribution ${transaction.id}` : 'Contribute capital or funds'}</h1>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
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
                            Contribute to
                        </th><th>
                            Description
                        </th><th>
                            Amount
                        </th></tr>
                    </thead><tbody>
                    {fields.map((item, index) =>
                        <ElementFamily key={item.id} {...{form, item, index, assetOptions}} />
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
    }

    return null
}

type ElementFamilyProps = {
    form: FCV<FormData>
    item: Partial<ArrayField<Record<string, any>, "id">>
    index: number
    assetOptions: {}
}

function ElementFamily(props: ElementFamilyProps) {
    const {form, item, index, assetOptions} = props
    return <tr key={item.id}><td>
        {!!item.eId && 
        <input type='hidden' name={`elements[${index}].eId`} value={item.eId} ref={form.register()} />}
        <select
            name={`elements[${index}].accountId`}
            defaultValue={item.accountId}
            ref={form.register()}>
            {assetOptions}
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
            forwardRef={form.register()}>
            {currencySelectOptions(item.currency)}
        </MaybeSelect> :
        <input
            type='hidden'
            name={`elements[${index}].currency`}
            value={item.currency}
            ref={form.register()}
        />}
        <input
            name={`elements[${index}].amount`}
            defaultValue={item.amount}
            ref={form.register()}
        />
        {form.errors.elements && form.errors.elements[index] &&
            form.errors.elements[index].amount &&
            <div>{form.errors.elements[index].amount!.message}</div>}
    </td></tr>

}

function extractFormValues(t: Transaction): FormData {
    const values: FormData = {
        date: parseISO(t.date!),
        description: t.description,
        elements: [],
    }

    if (t.elements) {
        for (let e of t.elements) {
            if (e.drcr == Transaction.Debit) {
                // Only populate debit elements
                values.elements.push({
                    eId: e.id,
                    accountId: e.accountId!,
                    amount: toFormatted(e.amount!, e.currency!),
                    currency: e.currency!,
                    description: e.description,
                })
            }
        }
    }

    return values
}

// Returns true if validation succeeded, false otherwise
function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!data.date) {
        form.setError('date', '', 'Date is required')
        return false
    }
    if (!data.elements || data.elements.length == 0) {
        form.setError('submit', '', 'Nothing to save')
        return false
    }
    return validateElementAmounts(form, data)
}

// Returns: id of the transaction that was saved/created, 0 otherwise
async function saveFormData(transaction: Transaction, data: FormData, trx?: TransactionOrKnex): Promise<number> {
    Object.assign(transaction, {
        description: data.description,
        type: Transaction.Contribution,
        date: toDateOnly(data.date)
    })

    // Convert form data to elements
    const elements: IElement[] = data.elements.map(e0 => {
        return {
            id: e0.eId ? Number(e0.eId) : undefined,
            accountId: Number(e0.accountId),
            drcr: Transaction.Debit,
            // Note: Use the currency value of the first item
            amount: parseFormatted(e0.amount, data.elements[0].currency),
            currency: data.elements[0].currency,
            description: e0.description,
            settleId: 0,
        }
    })

    // Generate balancing elements. Try to re-use IDs if available
    const sums = Transaction.getSums(elements)
    const ids = transaction.getCrElementIds()

    for (let currency in sums) {
        elements.push({
            id: ids.shift(),
            accountId: Account.Reserved.Equity,
            drcr: Transaction.Credit,
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
