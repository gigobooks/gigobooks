/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { BlobParamsAndFilename } from './PDFView'
import { dirname } from '../util/util'

const PDFDIR = 'pdfDir'

function pdfDir() {
    return localStorage.getItem(PDFDIR) || undefined
}

function setPdfDir(directory: string) {
    localStorage.setItem(PDFDIR, directory)
}

export default function PDFDownloadLink(props: BlobParamsAndFilename) {
    async function saveBlob() {
        const filename = await dialog.File({type: 'save', title: 'Save PDF as', startDir: pdfDir()})
        await native.writeFile(filename, props.blob!)
        setPdfDir(dirname(filename))
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
