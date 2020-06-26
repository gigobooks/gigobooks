import * as React from 'react'
import { useForm, useFieldArray, FormContextValues as FCV } from 'react-hook-form'
import { Project } from '../core'
import { playSuccess, playAlert } from '../util/sound'
import { currencySelectOptionsAll } from './SelectOptions'
import { refreshWindowTitle } from '../util/util'

type FormData = {
    title: string
    address: string
    currency: string
    otherCurrencies: string[]
    fiscalYear: string
    submit?: string    // Only for displaying general submit error messages
}

export default function Settings() {
    const form = useForm<FormData>({
        defaultValues: extractFormValues()
    })
    const {fields, append} = useFieldArray({control: form.control, name: 'otherCurrencies'})

    const onSubmit = async (data: FormData) => {
        if (!validateFormData(form, data)) {
            playAlert()
            return
        }

        saveFormData(data).then(() => {
            playSuccess()
            refreshWindowTitle()
            form.reset(extractFormValues())
        }).catch(e => {
            playAlert()
            form.setError('submit', '', e.toString())
        })
    }

    return <div>
        <h1>
            <span className='title'>
                Settings
            </span>
        </h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <table className='horizontal-table-form'><tbody><tr className='row row-title'>
                <th scope='row'>
                    <label htmlFor='title'>Title:</label>
                </th><td>
                    <input name='title' ref={form.register} />
                    {form.errors.title && <span className='error'>
                        {form.errors.title.message}
                    </span>}
                </td>
            </tr><tr className='row row-textarea row-address'>
                <th scope='row'>
                    <label htmlFor='address'>Address:</label>
                </th><td>
                    <textarea name='address' ref={form.register}/>
                    {form.errors.address && <span className='error'>
                        {form.errors.address.message}
                    </span>}
                </td>
            </tr><tr className='row row-currency'>
                <th scope='row'>
                    <label htmlFor='currency'>Primary currency:</label>
                </th><td>
                    <select name='currency' ref={form.register}>
                        {currencySelectOptionsAll()}
                    </select>
                    <button type='button' onClick={() => append({name: 'otherCurrencies'})}>
                        Add currency
                    </button>
                </td>
            </tr>

            {fields.map((item, index) =>
                <tr key={item.id} className='row row-other-currency'><th scope='row'>
                    {index == 0
                    ? <label htmlFor='otherCurrencies'>Other currencies:</label>
                    : <>&nbsp;</>}                        
                </th><td>
                    <select
                        name={`otherCurrencies[${index}]`}
                        defaultValue={item.value}
                        ref={form.register()}
                    >
                        <option key='none' value='none'>None</option>
                        {currencySelectOptionsAll()}
                    </select>
                </td></tr>
            )}            

            <tr className='row row-fiscal-year'>
                <th scope='row'>
                    <label htmlFor='fiscalYear'>Fiscal year:</label>
                </th><td>
                    <select name='fiscalYear' ref={form.register}>
                        <option key='0101' value='0101'>1 January to 1 December</option>
                        <option key='0104' value='0104'>1 April to 31 March</option>
                        <option key='0604' value='0604'>6 April to 5 April</option>
                        <option key='0107' value='0107'>1 July to 30 June</option>
                        <option key='0110' value='0110'>1 October to 30 September</option>
                    </select>
                </td>
            </tr></tbody></table>
            <div className='errors'>
                {form.errors.submit && form.errors.submit.message}
            </div><div className='buttons'>
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
    return values
}

// Returns true if validation succeeded, false otherwise
export function validateFormData(form: FCV<FormData>, data: FormData) {
    if (!data.title) {
        form.setError('title', '', 'Title is required')
        return false
    }
    return true
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    // Filter out $currency and 'none' from otherCurrencies.
    // Then remove duplicates and sort.
    data.otherCurrencies = data.otherCurrencies || []
    data.otherCurrencies = [...new Set(data.otherCurrencies.filter(c => {
        return c != data.currency && c != 'none'
    }))].sort()

    await Project.variables.setMultiple(data)
}
