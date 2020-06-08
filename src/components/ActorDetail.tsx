import * as React from 'react'
import { useForm, FormContextValues as FCV } from 'react-hook-form'
import { Redirect } from 'react-router-dom'
import { Actor } from '../core'
import { playSuccess, playAlert } from '../util/sound'

type Props = {
    pathDir: string
    arg1?: string
    customer?: boolean
    supplier?: boolean
}

type FormData = {
    title: string
    type: string
    taxId: string
    address: string
    submit?: string    // Only for displaying general submit error messages
}

export default function ActorDetail(props: Props) {
    if ((!props.customer && !props.supplier) || (props.customer && props.supplier)) {
        return null
    }
    const isCustomer = !props.supplier
    const actorType = isCustomer ? Actor.Customer : Actor.Supplier

    // argId == 0 means creating a new object
    const argId = /^\d+$/.test(props.arg1!) ? Number(props.arg1) : 0

    const [actor, setActor] = React.useState<Actor>()
    const [redirectId, setRedirectId] = React.useState<number>(0)

    const form = useForm<FormData>()

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(0)

        // Load object (if exists) and initialise form accordingly
        if (argId > 0) {
            Actor.query().findById(argId)
            .where('type', actorType)
            .then(a => {
                setActor(a)
                if (a) {
                    form.reset(extractFormValues(a))
                }
            })
        }
        else {
            setActor(Actor.construct({}))
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

        saveFormData(actor!, data).then(savedId => {
            playSuccess()
            form.reset(extractFormValues(actor!))
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
    else if (actor) {
        return <div>
            <h1>{actor.id ?
                `${isCustomer ? 'Customer' : 'Supplier'} ${actor.id}` :
                `New ${isCustomer ? 'customer' : 'supplier'}`}</h1>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor='title'>Name:</label>
                    <input name='title' ref={form.register} />
                    {form.errors.title && form.errors.title.message}
                </div><div>
                    <label htmlFor='taxId'>Tax registration (type and id):</label>
                    <input name='taxId' ref={form.register} />
                    {form.errors.taxId && form.errors.taxId.message}
                </div><div>
                    <label htmlFor='address'>Address:</label>
                    <textarea name='address' ref={form.register}/>
                </div><div>
                    <input name='type' type='hidden' value={actorType} ref={form.register} />
                    {form.errors.submit && form.errors.submit.message}
                </div><div>
                    <input type='submit' value={argId ? 'Save' : 'Create'} />
                </div>
            </form>
        </div>
    }

    return null
}

function extractFormValues(a: Actor): FormData {
    return {
        title: a.title!,
        type: a.type!,
        taxId: a.taxId!,
        address: a.address!,
    }
}

// Returns true if validation succeeded, false otherwise
export function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!data.title) {
        form.setError('title', '', 'Name is required')
        return false
    }
    return true
}

// Returns: id of the object that was saved/created, 0 otherwise
async function saveFormData(actor: Actor, data: FormData): Promise<number> {
    Object.assign(actor, data)
    await actor.save()
    return actor.id!
}
