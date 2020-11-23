/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME, VERSION, LICENSE, Project } from '../core'
import { AboutExtra } from './Stubs'

var LOGO_URL = require('../../assets/media/logo.png').default

export default function About() {
    const [sqliteVersion, setSqliteVersion] = React.useState<string>('')

    React.useEffect(() => {
        if (Project.isOpen()) {
            Project.knex.raw('SELECT sqlite_version() as version').then(rows => {
                if (rows && rows.length > 0) {
                    setSqliteVersion(rows[0].version)
                }
            })
        }
    }, [Project.isOpen])

    return <div className='page-about'>
        <div className='title-section'>
            <span className='breadcrumb'><Link to='/'>Home</Link> » </span>
            <h1 className='title inline'>About {APP_NAME}</h1>
        </div>

        <img className='logo' src={LOGO_URL} />
        <div className='info'>
            <ul><li>
                <label>Version:</label> {VERSION}
            </li><li>
                <label>Sqlite:</label> {Project.driver}
            </li>{sqliteVersion && <li>
                <label>Sqlite version:</label> {sqliteVersion}
            </li>}<li>
                <label>License:</label> {LICENSE}
            </li></ul>
        </div>

        <div className='extra'>
            <AboutExtra />
        </div>

        <div className='disclaimer'>
            <strong>Disclaimer</strong>
            <p>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR<br />
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,<br />
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE<br />
            AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER<br />
            LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,<br />
            OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE<br />
            SOFTWARE.
            </p>
        </div>

        <div className='sys-info'>
            <strong>System Information</strong>
            <ul><li>
                <label>User agent:</label> {window.navigator.userAgent}
            </li><li>
                <label>Locale:</label> {navigator.languages ? `[ "${(navigator.languages).join('", "')}" ]` : navigator.language}
            </li></ul>
        </div>
    </div>
}
