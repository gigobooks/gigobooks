import * as React from 'react'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { Redirect } from "react-router-dom"
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Transaction, Account } from '../core'
import { toDateOnly } from '../util/util'

type FormData = {
    date: Date
    description?: string
    entries: {accountId?: number, amount?: string}[]
}

export default function ContributeCapital() {
    const {control, register, handleSubmit, errors, setError} = useForm<FormData>({
        defaultValues: {
            date: new Date(),
            entries: [{}, {}]
        }
    })
    const {fields, append} = useFieldArray({control, name: 'entries'})
    const [accounts, setAccounts] = React.useState<Account[]>([])
    const [savedId, setSavedId] = React.useState(0)

    React.useEffect(() => {
        Account.query().select()
        .whereIn('type', [Account.Asset, Account.LongTermAsset])
        .orderBy(['type', 'title'])
        .then((rows: Account[]) => {
            // Omit 'Accounts Receivable'
            setAccounts(rows.filter((a: Account) => {
                return a.id != Account.Reserved.AccountsReceivable
            }))
        })
    }, [])

    const onSubmit = async (data: FormData) => {
        // Filter out zero entries. Also take a sum
        let sum = 0
        const entries0 = data.entries.filter(e => {
            sum += Number(e.amount)
            return e.amount != ''
        })

        if (entries0.length > 0 && sum > 0) {
            const t = Transaction.construct({
                description: data.description,
                type: Transaction.Contribution,
                date: toDateOnly(data.date)
            })

            // Convert form data to entries
            const entries = entries0.map(e => {
                return {
                    accountId: Number(e.accountId),
                    drcr: Transaction.Credit,
                    amount: Number(e.amount),
                }
            })

            // Add a balancing entry
            entries.push({
                accountId: Account.Reserved.Equity,
                drcr: Transaction.Debit,
                amount: sum,
            })

            // Merge and save
            t.mergeEntries(entries)
            await t.save()
            setSavedId(t.id!)
        }
        else {
            setError('entries', 'required', 'At least one amount is required')
        }
    }

    return savedId <= 0 ? <div>
        <h1>Contribute capital or funds</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='date'>Date:</label>
                <Controller
                    as={<DatePicker
                        onChange={() => {}}  // No-op.
                    />}
                    control={control}
                    register={register({required: true})}
                    name='date'
                    valueName='selected'
                    onChange={([selected]) => {
                        return selected
                    }}
                    rules={{required: true}}
                />
                {errors.date && 'Date is required'}
            </div><div>
                <label htmlFor='description'>Description:</label>
                <input name='description' ref={register} />
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
                        <select name={`entries[${index}].accountId`} ref={register()}>
                        {accounts.map(a =>
                            <option key={a.id} value={a.id}>{a.title}</option>
                        )}
                        </select>
                    </td><td>
                        <input type='number' name={`entries[${index}].amount`} ref={register({
                            pattern: {
                                value: /^\d*$/,
                                message: 'Invalid amount'
                            }
                        })} />
                        {errors.entries && errors.entries[index] &&
                            (errors.entries[index] as any).amount.message}
                    </td></tr>
                )}
                </tbody></table>
                {errors.entries && (errors.entries as any).message}
            </div><div>
                <button type='button' onClick={() => append({name: 'entries'})}>
                    More rows
                </button>
            </div><div>
                <input type='submit' />
            </div>
        </form>
    </div>
    : <Redirect to={`/contributions/${savedId}`} />
}
