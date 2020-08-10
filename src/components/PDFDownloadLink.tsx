/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { BlobParamsAndFilename } from './PDFView'

export default function PDFDownloadLink(props: BlobParamsAndFilename) {
    async function saveBlob() {
        // ToDo: mru startDir
        const filename = await dialog.File({type: 'save', title: 'Save PDF as'})
        await native.writeFile(filename, props.blob!)
    }

    function onClick(e: any) {
        saveBlob()
        e.preventDefault()
    }

    return <a className='pdf-download-link'
        onClick={onClick}
        download={props.filename ? props.filename : 'document.pdf'}
        href={props.url!}>Save PDF</a>
}
