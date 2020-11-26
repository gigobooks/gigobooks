/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { useForm, FormContextValues as FCV } from 'react-hook-form'
import { Link, Redirect } from 'react-router-dom'
import { Project, Actor } from '../core'
import { playSuccess, playAlert } from '../util/sound'
import { Required } from './Misc'

const taxIdLabelOptions0 = ['ABN', 'GST', 'VAT ID']

type Props = {
    arg1?: string
    customer?: boolean
    supplier?: boolean
}

type FormData = {
    title: string
    type: string
    taxId: string
    taxIdLabel: string
    taxIdLabelCustom?: string
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
    const [taxIdLabelOptions, setTaxIdLabelOptions] = React.useState<string[] | undefined>()
    const [redirectId, setRedirectId] = React.useState<number>(-1)

    const form = useForm<FormData>()
    const taxIdLabel = form.watch('taxIdLabel')

    // Initialise a lot of stuff
    React.useEffect(() => {
        // Clear redirectId
        setRedirectId(-1)

        Project.knex('actor').distinct('taxIdLabel').where('taxIdLabel', '<>', '').then(labels => {
            const values = [...taxIdLabelOptions0, ...labels.map(i => i.taxIdLabel)]
            setTaxIdLabelOptions([...new Set(values.sort())])
        })

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
    }, [props.arg1, actor && actor.id && actor.updatedAt ? actor.updatedAt.toString() : 0])

    const onSubmit = async (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        saveFormData(actor!, data).then(savedId => {
            playSuccess()
            form.reset(extractFormValues(actor!))
            if (savedId && argId != savedId) {
                setRedirectId(savedId)
            }
        }).catch(e => {
            playAlert()
            form.setError('submit', '', e.toString())
        })
    }

    if (redirectId >= 0 && redirectId != argId) {
        return <Redirect to={`/${isCustomer ? 'customer' : 'supplier'}s/${redirectId ? redirectId : 'new'}`} />
    }
    else if (actor && taxIdLabelOptions) {
        return <div>
            <div className='title-pane'>
                <span className='breadcrumb'><Link to='/actors'>Customers and Suppliers</Link> » </span>
                <h1 className='title inline'>
                    {actor.id ? actor.title : `New ${isCustomer ? 'customer' : 'supplier'}`}
                </h1>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <table className='horizontal-table-form'><tbody><tr className='row row-title'>
                    <th scope='row'>
                        <label htmlFor='title'>Name<Required />:</label>
                    </th><td>
                        <input name='title' ref={form.register} />
                        {form.errors.title && <span className='error'>
                            {form.errors.title.message}
                        </span>}
                    </td>
                </tr><tr className='row row-tax-id'>
                    <th scope='row'>
                        <label htmlFor='taxId'>Tax Id:</label>
                    </th><td>
                        <select name='taxIdLabel' ref={form.register}>
                            <option key='' value=''></option>
                            {taxIdLabelOptions.map(v => <option key={v} value={v}>{v}</option>)}
                            <option key='custom' value='custom'>{'<custom>'}</option>
                        </select>
                        {taxIdLabel == 'custom' && <input name='taxIdLabelCustom' ref={form.register} placeholder='example: VAT ID' />}

                        <input name='taxId' ref={form.register} />
                        {form.errors.taxIdLabel && <span className='error'>
                            {form.errors.taxIdLabel.message}
                        </span>}
                        {form.errors.taxId && <span className='error'>
                            {form.errors.taxId.message}
                        </span>}
                    </td>
                </tr><tr className='row row-textarea row-address'>
                    <th scope='row'>
                        <label htmlFor='address'>Address:</label>
                    </th><td>
                        <textarea name='address' ref={form.register}/>
                    </td>
                </tr>{!!actor.id && <tr className='row row-type'>
                    <th scope='row'>
                        <label htmlFor='type'>Type:</label>
                    </th><td>
                        {actor.type}
                    </td>
                </tr>}{!!actor.id &&<tr className='row row-id'>
                    <th scope='row'>
                        <label htmlFor='id'>Id:</label>
                    </th><td>
                        {actor.id}
                    </td>
                </tr>}</tbody></table>
                <input name='type' type='hidden' value={actorType} ref={form.register} />
                <div className='error'>
                    {form.errors.submit && form.errors.submit.message}
                </div><div className='buttons'>
                    <input type='submit' value='Save' />
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
        taxIdLabel: a.taxIdLabel!,
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
    if (data.taxIdLabel == 'custom') {
        data.taxIdLabel = data.taxIdLabelCustom!
    }
    delete data.taxIdLabelCustom

    Object.assign(actor, data)
    await actor.save()
    return actor.id!
}
