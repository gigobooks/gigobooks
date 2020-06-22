import * as React from 'react'
import { useForm, FormContextValues as FCV } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Project } from '../core'
import { playSuccess, playAlert } from '../util/sound'

type FormData = {
    taxId: string
    taxEnable: Record<string, string | false>
    customTaxCodes: string
    submit?: string    // Only for displaying general submit error messages
}

export default function SettingsTax() {
    const form = useForm<FormData>({
        defaultValues: extractFormValues(),
    })

    const onSubmit = async (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        saveFormData(data).then(() => {
            playSuccess()
            form.reset(extractFormValues())
        }).catch(e => {
            playAlert()
            form.setError('submit', '', e.toString())
        })
    }

    return <div>
        <h1>
            <span className='breadcrumb'>
                <Link to='/settings'>Settings</Link> » </span>
            <span className='title'>
                Tax Settings
            </span>
        </h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='taxId'>Tax registrations (type and id):</label>
                <textarea name='taxId' ref={form.register} />
                {form.errors.taxId && form.errors.taxId.message}
            </div><div>
                <table><tbody>
                    <tr><td>
                        <label htmlFor='taxEnable'>Enable taxes:</label>
                    </td><td>
                        <label><input name='taxEnable[AU]' type='checkbox' value='AU' ref={form.register} />Australia</label>
                    </td></tr>
                    <tr><td>
                        &nbsp;
                    </td><td>
                        <label><input name='taxEnable[CA]' type='checkbox' value='CA' ref={form.register} />Canada</label>
                    </td></tr>
                    <tr><td>
                        &nbsp;
                    </td><td>
                        <label><input name='taxEnable[EU]' type='checkbox' value='EU' ref={form.register} />Europe</label>
                    </td></tr>
                    <tr><td>
                        &nbsp;
                    </td><td>
                        <label><input name='taxEnable[US]' type='checkbox' value='US' ref={form.register} />United States</label>
                    </td></tr>
                </tbody></table>
            </div><div>
                <label htmlFor='customTaxCodes'>Custom tax codes:</label>
                <textarea name='customTaxCodes' ref={form.register}/>
            </div><div>
                {form.errors.submit && form.errors.submit.message}
            </div><div>
                <input type='submit' value='Save' />
            </div>
        </form>
    </div>
}

function extractFormValues(): FormData {
    const values = Project.variables.getMultiple([
        'taxId',
        'taxEnable',
        'customTaxCodes',
    ])

    return {
        ...values,
        taxEnable: values.taxEnable.reduce((acc: Record<string, string>, val: string) => {
            acc[val] = val
            return acc
        }, {}),
    } as FormData
}

// Returns true if validation succeeded, false otherwise
export function validateFormData(form: FCV<FormData>, data: FormData) {
    return true
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    await Project.variables.setMultiple({
        ...data,
        taxEnable: Object.keys(data.taxEnable).filter(key => data.taxEnable[key]).sort(),
    })
}
