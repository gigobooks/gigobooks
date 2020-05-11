import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Project } from '../core'
import { CurrencySelectOptionsAll } from './SelectOptions'

type FormData = {
    title: string
    currencies: string[]
    submit?: string    // Only for displaying general submit error messages
}

export default function Settings() {
    const [formValues, setFormValues] = React.useState<FormData>({} as FormData)
    const form = useForm<FormData>()

    // Initialise
    React.useEffect(() => {
        const values = extractFormValues()
        setFormValues(values)
        form.reset(values)
    }, [])

    const onSubmit = async (data: FormData) => {
        saveFormData(data).then(() => {
            const values = extractFormValues()
            setFormValues(values)
            form.reset(values)
        }).catch(e => {
            form.setError('submit', '', e.toString())
        })
    }

    return <div>
        <h1>Settings</h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='title'>Title:</label>
                <input name='title' ref={form.register({required: 'Title is required'})} />
                {form.errors.title && form.errors.title.message}
            </div><div>
                <label htmlFor='currencies'>Currencies:</label>
                <select name='currencies' multiple size={10} ref={form.register}>
                    <CurrencySelectOptionsAll currencies={formValues.currencies} />
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
    return Project.variables.getMultiple([
        'title',
        'currencies'
    ]) as FormData
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    await Project.variables.setMultiple(data)
}
