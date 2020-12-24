/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { MenuItem } from 'rc-menu'
import { Route, Switch, useRouteMatch } from 'react-router-dom'
import { Project, taxAuthorities } from '../core'
import { TaxReportAU,
    TaxReportCA, TaxReportCA_BC, TaxReportCA_MB, TaxReportCA_QC, TaxReportCA_SK,
    TaxReportIE, TaxReportNZ } from './DynamicImports'

export type TaxReport = {
    id: string
    label: string
    element: () => JSX.Element
}

type TaxReportInternal = TaxReport & { authority: string, path: string }

function injectFields(reports0: Record<string, (TaxReport)[]>): Record<string, TaxReportInternal[]> {
    // typecast
    const reports: Record<string, TaxReportInternal[]> = reports0 as any
    Object.keys(reports).forEach(authority => {
        reports[authority].forEach(report => {
            report.authority = authority
            report.path = `${report.authority.toLowerCase()}/${report.id}`
        })
    })
    return reports
}

const Reports: Record<string, TaxReportInternal[]> = injectFields({
    'AU': [{id: 'gst', label: 'GST calculation for BAS', element: TaxReportAU}],
    'CA': [{id: 'gst', label: 'GST/HST Return', element: TaxReportCA}],
    'CA-BC': [{id: 'st', label: '(BC) PST Return Worksheet', element: TaxReportCA_BC}],
    'CA-MB': [{id: 'st', label: '(MB) RST Return Worksheet', element: TaxReportCA_MB}],
    'CA-QC': [{id: 'st', label: '(QC) QST Return Worksheet', element: TaxReportCA_QC}],
    'CA-SK': [{id: 'st', label: '(SK) PST Return Worksheet', element: TaxReportCA_SK}],
    'IE': [{id: 'vat', label: 'VAT3 Return', element: TaxReportIE}],
    'NZ': [{id: 'gst', label: 'GST101A helper', element: TaxReportNZ}],
})

function taxReports() {
    const items: TaxReportInternal[] = []
    {[Project.variables.get('taxAuthority'), ...Project.variables.get('otherTaxAuthorities')].forEach(k => {
        if (taxAuthorities[k] && taxAuthorities[k].enable && Reports[k]) {
            items.push(...Reports[k])
        }
    })}

    return items
}

export function taxReportsMenuItems() {
    return taxReports().map(r =>
        <MenuItem key={`/reports/tax/${r.path}`}>{r.label}</MenuItem>
    )
}

export function TaxReportsRouter() {
    let match = useRouteMatch()

    return <Switch>
        {taxReports().map(r => {
            return <Route key={r.path} path={`${match.path}/${r.path}`}>
                {React.createElement(r.element)}
            </Route>
        })}
    </Switch>
}
