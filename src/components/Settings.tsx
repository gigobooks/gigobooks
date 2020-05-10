import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Project } from '../core'

type FormData = {
    title: string
    submit?: string    // Only for displaying general submit error messages
}

export default function Settings() {
    const form = useForm<FormData>()

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
        <h1>Settings</h1>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div>
                <label htmlFor='title'>Title:</label>
                <input name='title' ref={form.register({required: 'Title is required'})} />
                {form.errors.title && form.errors.title.message}
            </div><div>
                {form.errors.submit && form.errors.submit.message}
            </div><div>
                <input type='submit' value='Save' />
            </div>
        </form>
    </div>
}

function extractFormValues(): FormData {
    return Project.variables.getMultiple(['title']) as FormData
}

// Returns: positive for success, 0 otherwise
async function saveFormData(data: FormData) {
    await Project.variables.setMultiple(data)
}
