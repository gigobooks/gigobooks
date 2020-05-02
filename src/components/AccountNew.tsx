import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Redirect } from "react-router-dom"
import { Account, AccountType } from '../core'

type FormData = {
    title: string,
    type: AccountType,
}

export default function AccountNew() {
    const {register, handleSubmit, errors} = useForm<FormData>()
    const [savedId, setSavedId] = React.useState(0)

    const onSubmit = async (data: FormData) => {
        const account = Account.construct(data)
        await account.save()
        setSavedId(account.id!)
    }

    return savedId <= 0 ? <div>
        <h1>New Account</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='title'>Title:</label>
                <input name='title' ref={register({required: true})} />
                {errors.title && 'Title is required'}
            </div><div>
                <label htmlFor='name'>Type:</label>
                <select name='type' ref={register}>
                {Object.keys(Account.TypeInfo).map(type =>
                    <option key={type} value={type}>{Account.TypeInfo[type].label}</option>
                )}
                </select>
            </div><div>
                <input type='submit' />
            </div>
        </form>
    </div>
    : <Redirect to={`/accounts/${savedId}`} />
}
