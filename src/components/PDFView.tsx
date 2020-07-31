/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { BlobProvider } from '@react-pdf/renderer'
const pdfjsWebViewer = require('pdfjs-dist/web/pdf_viewer.js')
import 'pdfjs-dist/web/pdf_viewer.css'
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.min.js')
const pdfjs = require("pdfjs-dist/build/pdf.min.js")

// See 'pdfjs-dist/webpack.js'
if (typeof window !== "undefined" && "Worker" in window) {
    pdfjs.GlobalWorkerOptions.workerPort = new pdfjsWorker()
}

export default function PDFView(props: {children: any}) {
    return <BlobProvider document={props.children}>
        {({url}) => {
            return <Viewer url={url!} />
        }}
    </BlobProvider>
}

export function Viewer(props: {url: string}) {
    const container = React.useRef(null)
    const [scale, setScale] = React.useState<number>(1)
    const [viewer, setViewer] = React.useState<any>()

    React.useEffect(() => {
        if (props.url) {
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
                pdfViewer.setDocument(document)
            })
        }
    }, [props.url])

    function zoom(delta: number) {
        viewer.currentScale += delta
        setScale(viewer.currentScale)
    }

    return props.url ? <>
        <div className="pdfViewer-toolbar">
            <button className="zoom-button zoom-in" onClick={(e) => zoom(-0.1)}>-</button>
            <button className="zoom-button zoom-out" onClick={(e) => zoom(0.1)}>+</button>
            <span className="zoom-percent">{(scale * 100).toFixed(1)}%</span>
        </div>
        <div ref={container} className="pdfViewer-container">
            <div className="pdfViewer"></div>
        </div>
    </> : null
}
