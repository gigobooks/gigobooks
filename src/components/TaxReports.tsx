/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { MenuItem } from 'rc-menu'
import { Route, Switch, useRouteMatch } from 'react-router-dom'
import { Project, taxAuthorities } from '../core'
import TaxReportsAU from './TaxReportAU'
import TaxReportsCA from './TaxReportCA'
import TaxReportsCA_BC from './TaxReportCA_BC'
import TaxReportsCA_MB from './TaxReportCA_MB'
import TaxReportsCA_QC from './TaxReportCA_QC'
import TaxReportsCA_SK from './TaxReportCA_SK'
import TaxReportsIE from './TaxReportIE'
import TaxReportsNZ from './TaxReportNZ'

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
    ...TaxReportsAU,
    ...TaxReportsCA, ...TaxReportsCA_BC, ...TaxReportsCA_MB, ...TaxReportsCA_QC, ...TaxReportsCA_SK,
    ...TaxReportsIE,
    ...TaxReportsNZ,
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
