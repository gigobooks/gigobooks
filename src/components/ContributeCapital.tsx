import * as React from 'react'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { Redirect } from "react-router-dom"
import DatePicker from 'react-datepicker'
import { Transaction, Account } from '../core'
import { toDateOnly } from '../util/util'
import { parseISO } from 'date-fns'

type Props = {
    arg1?: string
}

type FormData = {
    date: Date
    description?: string
    entries: {
        id?: number,
        // `.id` is used by the form system so we have entryId to store 'our' id
        entryId?: number,
        accountId?: number,
        amount?: string
    }[]
}

export default function ContributeCapital(props: Props) {
    // argId == 0 means creating a new transaction
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [accounts, setAccounts] = React.useState<Account[]>([])
    const [transaction, setTransaction] = React.useState<Transaction>()
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()
    const {fields, append} = useFieldArray({control: form.control, name: 'entries'})

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load asset accounts
        Account.query().select()
        .whereIn('type', [Account.Asset, Account.LongTermAsset])
        .orderBy(['type', 'title'])
        .then((rows: Account[]) => {
            // Omit 'Accounts Receivable'
            setAccounts(rows.filter((a: Account) => {
                return a.id != Account.Reserved.AccountsReceivable
            }))
        })

        // Load transaction (if exists) and initialise form accordingly
        if (argId > 0) {
            Transaction.query().findById(argId).where('type', Transaction.Contribution).withGraphFetched('entries')
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
                date: new Date(),
                entries: [{}, {}]
            })
        }
    }, [props.arg1])

    const onSubmit = async (data: FormData) => {
        const sum = data.entries.reduce((acc, e) => {
            return acc + Number(e.amount)
        }, 0)

        if (argId == 0 && sum == 0) {
            // Don't allow creating if zero 
            form.setError('entries', 'required', 'At least one amount is required')
        } else if (transaction) {
            Object.assign(transaction, {
                description: data.description,
                type: Transaction.Contribution,
                date: toDateOnly(data.date)
            })

            // Convert form data to entries
            const entries = data.entries.map(e0 => {
                const e1 = e0.entryId ? {id: Number(e0.entryId)} : {}
                return {
                    ...e1,
                    accountId: Number(e0.accountId),
                    drcr: Transaction.Credit,
                    amount: Number(e0.amount),
                }
            })

            // Add a balancing entry
            const drId = transaction.getFirstDrEntryId()
            const dr = drId ? {id: drId} : {}
            entries.push({
                ...dr,
                accountId: Account.Reserved.Equity,
                drcr: Transaction.Debit,
                amount: sum,
            })

            // Merge and save. Handle any save errors
            await transaction.mergeEntries(entries)
            transaction.save().then(() => {
                if (argId == 0) {
                    setRedirectId(transaction.id!)
                }
                else {
                    transaction.condenseEntries()
                    form.reset(extractFormValues(transaction))
                }
            }).catch(e => {
                form.setError('entries', '', e.toString())
            })
        }
        else if (!transaction) {
            // This should never happen. Panic ?!
        }
    }

    if (redirectId > 0 && redirectId != argId) {
        return <Redirect to={`/contributions/${redirectId}`} />
    }
    else if (transaction && accounts) {
        return <div>
            <h1>{transaction.id ? `Contribution ${transaction.id}` : 'Contribute capital or funds'}</h1>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='date'>Date:</label>
                    <Controller
                        // No-op for DatePicker.onChange()
                        as={<DatePicker onChange={() => {}} />}
                        control={form.control}
                        register={form.register({required: true})}
                        name='date'
                        valueName='selected'
                        onChange={([selected]) => {
                            return selected
                        }}
                        rules={{required: true}}
                    />
                    {form.errors.date && 'Date is required'}
                </div><div>
                    <label htmlFor='description'>Description:</label>
                    <input name='description' ref={form.register} />
                </div><div>
                    <table><thead>
                        <tr><th>
                            Contribute to
                        </th><th>
                            Amount
                        </th></tr>
                    </thead><tbody>
                    {fields.map((item, index) =>
                        <tr key={item.id}><td>
                            {!!item.entryId && 
                            <input type='hidden' name={`entries[${index}].entryId`} value={item.entryId} ref={form.register()} />}
                            <select
                                name={`entries[${index}].accountId`}
                                defaultValue={item.accountId}
                                ref={form.register()}>
                            {accounts.map(a =>
                                <option key={a.id} value={a.id}>{a.title}</option>
                            )}
                            </select>
                        </td><td>
                            <input
                                name={`entries[${index}].amount`}
                                defaultValue={item.amount}
                                ref={form.register({
                                    pattern: {
                                        value: /^\d*$/,
                                        message: 'Invalid amount'
                                    }
                                })}
                            />
                            {form.errors.entries && form.errors.entries[index] &&
                                (form.errors.entries[index] as any).amount.message}
                        </td></tr>
                    )}
                    </tbody></table>
                    {form.errors.entries && (form.errors.entries as any).message}
                </div><div>
                    <button type='button' onClick={() => append({name: 'entries'})}>
                        More rows
                    </button>
                </div><div>
                    <input type='submit' />
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
        entries: [],
    }

    if (t.entries) {
        for (let e of t.entries) {
            if (e.drcr == Transaction.Credit) {
                // Only populate credit entries
                values.entries.push({
                    id: e.id,
                    entryId: e.id,
                    accountId: e.accountId,
                    amount: `${e.amount}`,
                })
            }
        }
    }

    return values
}
