/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { StyleSheet, View, Text } from './PDFView'

export const Styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        padding: 56,        // approx 2cm
        paddingBottom: 64,
    },
})

// Custom primitives on top of react-pdf
export function T({children, style}: any) {
    return <Text style={[{fontFamily: 'Helvetica'}, style]}>{children}</Text>
}

export function B({children, style}: any) {
    return <Text style={[{fontFamily: 'Helvetica-Bold'}, style]}>{children}</Text>
}

export function I({children, style}: any) {
    return <Text style={[{fontFamily: 'Helvetica-Oblique'}, style]}>{children}</Text>
}

export function Tr({children, style}: any) {
    return <View style={[{flexDirection: 'row', marginHorizontal: 'auto'}, style]} wrap={false}>{children}</View>
}

export function Th({children, style, innerStyle, width, indent}: any) {
    const style0: any = {}
    if (width) {
        style0.width = `${width}%`
    }
    if (indent) {
        style0.marginLeft = `${indent}%`
    }
    return <View style={[style0, style]}><B style={[{
        borderStyle: 'solid',
        borderColor: '#333',
    }, innerStyle]}>{children}</B></View>
}

export function ThLeft(props: any) {
    const {innerStyle, ...rest} = props
    return <Th innerStyle={[{
        marginRight: 6,
        textAlign: 'left',
    }, innerStyle]} {...rest} />
}

export function ThRight(props: any) {
    const {innerStyle, ...rest} = props
    return <Th innerStyle={[{
        marginLeft: 6,
        textAlign: 'right',
    }, innerStyle]} {...rest} />
}

export function Td({children, style, innerStyle, width, indent}: any) {
    const style0: any = {}
    if (width) {
        style0.width = `${width}%`
    }
    if (indent) {
        style0.marginLeft = `${indent}%`
    }
    return <View style={[style0, style]}><T style={[{
        borderStyle: 'solid',
        borderColor: '#333',
    }, innerStyle]}>{children}</T></View>
}

export function TdLeft(props: any) {
    const {innerStyle, ...rest} = props
    return <Td innerStyle={[{
        marginRight: 6,
        textAlign: 'left',
    }, innerStyle]} {...rest} />
}

export function TdRight(props: any) {
    const {innerStyle, ...rest} = props
    return <Td innerStyle={[{
        marginLeft: 6,
        textAlign: 'right',
    }, innerStyle]} {...rest} />
}
