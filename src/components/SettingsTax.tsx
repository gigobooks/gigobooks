import * as React from 'react'
import { useForm, FormContextValues as FCV } from 'react-hook-form'
import { Project } from '../core'
import { playSuccess, playAlert } from '../util/sound'

type FormData = {
    taxId: string
    taxEnable: string[]
    customTaxCodes: string
    submit?: string    // Only for displaying general submit error messages
}

export default function SettingsTax() {
    const form = useForm<FormData>()

    // Initialise
    React.useEffect(() => {
        form.reset(extractFormValues())
    }, [])

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
        <h1>Tax Settings</h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='taxId'>Tax registrations (type and id):</label>
                <textarea name='taxId' ref={form.register} />
                {form.errors.taxId && form.errors.taxId.message}
            </div><div>
                <label htmlFor='taxEnable'>Enable taxes:</label>
                <select name='taxEnable' multiple ref={form.register}>
                    <option key='AU' value='AU'>Australia</option>
                    <option key='CA' value='CA'>Canada</option>
                    <option key='EU' value='EU'>Europe</option>
                    <option key='US' value='US'>United States</option>
                </select>
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
    ]) as FormData

    return values
}

// Returns true if validation succeeded, false otherwise
export function validateFormData(form: FCV<FormData>, data: FormData) {
    return true
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    await Project.variables.setMultiple(data)
}
