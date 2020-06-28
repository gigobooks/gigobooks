/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { useParams, Redirect } from 'react-router-dom'

export default function UrlBar() {
    useParams()     // This is needed to re-trigger something
    const [path, setPath] = React.useState<string>('')
    const [destPath, setDestPath] = React.useState<string>('')

    React.useEffect(() => {
        setPath(window.location.hash.substring(1))
        setDestPath('')
    }, [window.location.hash])

    type FormData = { path: string }
    const {register, reset, handleSubmit} = useForm<FormData>()

    const onSubmit = async ({path}: FormData) => {
        setDestPath(path)
        reset()
    }

    return <>
        <form onSubmit={handleSubmit(onSubmit)} style={{display: 'inline'}}>
            <input name='path' ref={register({required: true})} defaultValue={path} />
            <input type='submit' value='Goto' />
        </form>
        {destPath != '' && path != destPath && <Redirect to={destPath} />}
    </>
}
