/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, BlobProvider, StyleSheet, View, Text } from '@react-pdf/renderer'
export { Document, Page, StyleSheet, View, Text }
export * from './PDF'

const pdfjsWebViewer = require('pdfjs-dist/web/pdf_viewer.js')
import 'pdfjs-dist/web/pdf_viewer.css'

// Beware: These have been hand-patched so they don't use Promise.allSettled.
// The .min.js versions may not have been hand-patched
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.js')
const pdfjs = require("pdfjs-dist/build/pdf.js")

import PDFDownloadLink from './PDFDownloadLink'

// See 'pdfjs-dist/webpack.js'
if (typeof window !== "undefined" && "Worker" in window) {
    pdfjs.GlobalWorkerOptions.workerPort = new pdfjsWorker()
}

type BlobParams = {
    blob: Blob | null
    url: string | null
    loading: boolean
    error: Error | null
}

export type BlobParamsAndFilename = BlobParams & {filename?: string}

export function PDFView(props: {_key?: any, children: any, filename?: string}) {
    return <BlobProvider key={props._key} document={props.children}>
        {(params: BlobParams) => {
            return <Viewer key={params.url!} {...params} filename={props.filename}/>
        }}
    </BlobProvider>
}

export default PDFView

export function Viewer(props: BlobParamsAndFilename) {
    const container = React.useRef(null)
    const [scale, setScale] = React.useState<number>(1)
    const [viewer, setViewer] = React.useState<any>()

    React.useEffect(() => {
        let mounted = true

        if (mounted && props.url) {
            const eventBus = new pdfjsWebViewer.EventBus()
            eventBus.on('pagesinit', (e: any) => {
                setScale(e.source.currentScale)
            })

            const pdfViewer = new pdfjsWebViewer.PDFViewer({
                container: container.current,
                eventBus,
            })
            setViewer(pdfViewer)

            const loadingTask = pdfjs.getDocument(props.url)
            loadingTask.promise.then((document: any) => {
                if (mounted) {
                    pdfViewer.setDocument(document)
                }
            })
        }

        return () => {mounted=false}
    }, [props.url])

    function zoom(delta: number) {
        viewer.currentScale += delta
        setScale(viewer.currentScale)
    }

    return props.url ? <>
        <div className="pdfViewer-toolbar">
            <PDFDownloadLink {...props} />
            <button className="zoom-button zoom-in" onClick={(e) => zoom(-0.1)}>-</button>
            <button className="zoom-button zoom-out" onClick={(e) => zoom(0.1)}>+</button>
            <span className="zoom-percent">{(scale * 100).toFixed(1)}%</span>
        </div>
        <div ref={container} className="pdfViewer-container">
            <div className="pdfViewer"></div>
        </div>
    </> : null
}
