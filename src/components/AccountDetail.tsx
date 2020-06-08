import * as React from 'react'
import { useForm, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import { Account, AccountType } from '../core'
import { playSuccess, playAlert } from '../util/sound'

type Props = {
    pathDir: string
    arg1?: string
}

type FormData = {
    title: string
    type: AccountType
    submit?: string    // Only for displaying general submit error messages
}

export default function AccountDetail(props: Props) {
    // argId == 0 means creating a new object
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [account, setAccount] = React.useState<Account>()
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load object (if exists) and initialise form accordingly
        if (argId > 0) {
            Account.query().findById(argId)
            .then(a => {
                setAccount(a)
                if (a) {
                    form.reset(extractFormValues(a))
                }
            })
        }
        else {
            setAccount(Account.construct({}))
            form.reset({
                title: '',
            })
        }
    }, [props.arg1])

    const onSubmit = async (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        saveFormData(account!, data).then(savedId => {
            playSuccess()
            form.reset(extractFormValues(account!))
            if (argId == 0 && savedId) {
                setRedirectId(savedId)
            }
        }).catch(e => {
            playAlert()
            form.setError('submit', '', e.toString())
        })
    }

    if (redirectId > 0 && redirectId != argId) {
        return <Redirect to={`${props.pathDir}/${redirectId}`} />
    }
    else if (account) {
        return <div>
            <h1>{account.id ? `Account ${account.id}` : 'New account'}</h1>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='title'>Title:</label>
                    <input name='title' ref={form.register} />
                    {form.errors.title && form.errors.title.message}
                </div><div>
                    <label htmlFor='type'>Type:</label>
                    <select name='type' ref={form.register} disabled={!!account.id}>
                    {Object.keys(Account.TypeInfo).map(type =>
                        <option key={type} value={type}>{Account.TypeInfo[type].label}</option>
                    )}
                    </select>
                </div><div>
                    {form.errors.submit && form.errors.submit.message}
                </div><div>
                    <input type='submit' value={argId ? 'Save' : 'Create'} disabled={account.isReserved} />
                </div>
            </form>
        </div>
    }

    return null
}

function extractFormValues(a: Account): FormData {
    return {
        title: a.title!,
        type: a.type!,
    }
}

// Returns true if validation succeeded, false otherwise
export function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!data.title) {
        form.setError('title', '', 'Title is required')
        return false
    }
    return true
}

// Returns: id of the object that was saved/created, 0 otherwise
async function saveFormData(account: Account, data: FormData): Promise<number> {
    if (account.isReserved) {
        return Promise.reject('Cannot modify a system account')
    }

    account.title = data.title
    if (!account.id) {
        // Only assign type for new accounts. Don't change type for existing accounts.
        account.type = data.type
    }
    await account.save()
    return account.id!
}
