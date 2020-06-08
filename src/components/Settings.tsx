import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Project } from '../core'
import { playSuccess, playAlert } from '../util/sound'
import { currencySelectOptionsAll } from './SelectOptions'

type FormData = {
    title: string
    address: string
    currency: string
    otherCurrencies: string[]
    fiscalYear: string
    submit?: string    // Only for displaying general submit error messages
}

export default function Settings() {
    const form = useForm<FormData>()
    const formValues: any = form.getValues()

    // Initialise
    React.useEffect(() => {
        form.reset(extractFormValues())
    }, [])

    const onSubmit = async (data: FormData) => {
        saveFormData(data).then(() => {
            playSuccess()
            form.reset(extractFormValues())
        }).catch(e => {
            playAlert()
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
                <label htmlFor='address'>Address:</label>
                <textarea name='address' ref={form.register}/>
                {form.errors.address && form.errors.address.message}
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
                <label htmlFor='fiscalYear'>Fiscal year:</label>
                <select name='fiscalYear' ref={form.register}>
                    <option key='0101' value='0101'>1 January to 1 December</option>
                    <option key='0104' value='0104'>1 April to 31 March</option>
                    <option key='0604' value='0604'>6 April to 5 April</option>
                    <option key='0107' value='0107'>1 July to 30 June</option>
                    <option key='0110' value='0110'>1 October to 30 September</option>
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
        'title',
        'address',
        'currency',
        'otherCurrencies',
        'fiscalYear',
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
