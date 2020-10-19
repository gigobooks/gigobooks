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
        let filename
        try {
            filename = await dialog.file({type: 'save', title: 'Save PDF as', startDir: pdfDir()})
        }
        catch (e) {
            if (e.toString() != 'Cancelled') {
                throw e
            }
        }

        if (filename) {
            await native.writeFile(filename, props.blob!)
            setPdfDir(dirname(filename))
        }
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
