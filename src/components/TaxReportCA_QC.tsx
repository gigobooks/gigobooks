/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { TaxReport } from './TaxReports'

const Reports: Record<string, TaxReport[]> = {
    'CA-QC': [{id: 'st', label: '(QC) QST Return Worksheet', element: TaxReportImpl}]
}

export default Reports

function TaxReportImpl() {
    return <div>
        <h1 className='title'>QC QST Return Worksheet</h1>
        <p>Not implemented yet. Please contact the software developer or site administrator.</p>
    </div>
}
