import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Account } from '../core'

export default function AccountDetail({id}: {id?: any}) {
    const [account, setAccount] = React.useState<Account>()
    React.useEffect(() => {
        Account.query().findById(id).then((a: Account) => {
            setAccount(a)
        })
    }, [id])

    type FormData = { title: string }
    const {register, errors, handleSubmit} = useForm<FormData>()
    const onSubmit = async (data: FormData) => {
        if (data.title != account!.title) {
            account!.title = data.title
            await account?.save()
            setAccount(account)
        }
    }

    return !!account && <div>
        <h1>{account?.title}</h1>
        <p>Type: {Account.TypeInfo[account.type!].label}</p>
        {!account.isReserved && 
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='title'>Title:</label>
                <input name='title' ref={register({required: true})} defaultValue={account.title} />
                {errors.title && 'Title is required'}
            </div><div>
                <input type='submit' value='Rename' />
            </div>
        </form>
        }
    </div>
}
