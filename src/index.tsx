/**
 * Copyright (c) 2020-present Beng Tan
 */

import './util/polyfills'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import App from './components/App'

// import { Project } from './core'
// Project.open('samplecompany.db').then(() => {

ReactDOM.render(<App />, document.getElementById("root"))

// })
