import * as React from 'react'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Transaction, Account } from '../core'

type FormData = {
    date: Date
    description?: string
    entries: {id?: number, amount?: string}[]
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


    // const [savedId, setSavedId] = React.useState(0)

    const onSubmit = async (data: FormData) => {
        // console.log('ContributeCapital.tsx onSubmit() data:', data)
        // setError('entries', 'required', 'blah blah')
    }
    
    return <div>
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
                <input name='description' ref={register()} />
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
                        <select name={`entries[${index}].id`} ref={register}>
                        {accounts.map(a =>
                            <option key={a.id} value={a.id}>{a.title}</option>
                        )}
                        </select>
                    </td><td>
                        <input name={`entries[${index}].amount`} ref={register()} />
                    </td></tr>
                )}
                </tbody></table>
                {errors.entries && 'At least one amount is required'}
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
