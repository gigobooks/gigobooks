import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Project } from '../core'
import { countrySubdivisionOptions, countryOptions } from './SelectOptions'

type FormData = {
    country: string
    subdivision: string
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
                <label htmlFor='country'>Country:</label>
                <select
                    name='country'
                    onChange={e => {
                        form.reset({country: e.target.value})
                    }}
                    ref={form.register}
                >
                    {countryOptions()}
                </select>
            </div><div>
                <label htmlFor='subdivision'>Subdivision:</label>
                <select name='subdivision' ref={form.register}>
                    {countrySubdivisionOptions(formValues.country)}
                </select>
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
        'country',
        'subdivision',
    ]) as FormData

    return values
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    await Project.variables.setMultiple(data)
}
