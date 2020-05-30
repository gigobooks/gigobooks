import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Project } from '../core'

type FormData = {
    taxEnable: string[]
    customTaxCodes: string
    submit?: string    // Only for displaying general submit error messages
}

export default function SettingsTax() {
    const form = useForm<FormData>()
    const formValues: any = form.getValues()

    // Initialise
    React.useEffect(() => {
        form.reset(extractFormValues())
    }, [])

    const onSubmit = async (data: FormData) => {
        saveFormData(data).then(() => {
            form.reset(extractFormValues())
        }).catch(e => {
            form.setError('submit', '', e.toString())
        })
    }

    return <div>
        <h1>Tax Settings</h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
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
        'taxEnable',
        'customTaxCodes',
    ]) as FormData

    return values
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    await Project.variables.setMultiple(data)
}
