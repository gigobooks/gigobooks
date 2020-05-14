import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Project } from '../core'
import { currencySelectOptionsAll } from './SelectOptions'

type FormData = {
    title: string
    currency: string
    otherCurrencies: string[]
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
                <label htmlFor='currency'>Primary currency:</label>
                <select name='currency' ref={form.register}>
                    {currencySelectOptionsAll()}
                </select>
            </div><div>
                <label htmlFor='otherCurrencies'>Other currencies:</label>
                <select name='otherCurrencies' multiple size={10} ref={form.register}>
                    <option key='none' value='none'>None</option>
                    {currencySelectOptionsAll(formValues.otherCurrencies)}
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
    const values: any = Project.variables.getMultiple([
        'title',
        'currency',
        'otherCurrencies'
    ]) as FormData

    if (!values.otherCurrencies || values.otherCurrencies.length == 0) {
        values.otherCurrencies = ['none']
    }
    return values
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    // Filter out $currency and 'none' from otherCurrencies
    data.otherCurrencies = data.otherCurrencies.filter(c => {
        return c != data.currency && c != 'none'
    })
    await Project.variables.setMultiple(data)
}
