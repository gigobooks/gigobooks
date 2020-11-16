# Gig'o'Books

* Non-cloud accounting app for solopreneurs, consultants, freelancers and gig economy workers.
* Privacy focused. Not cloud-based SaaS. Retain control over your data.
* Open data format. No lock-in. Retain control over your data.
* Source code that you can extend/hack/customise yourself. Write your own custom scripts.
* Double entry bookkeeping
* Multi currency
* Quick Start: [**Try the web edition**](https://www.gigobooks.com/webapp)

There are multiple editions of Gig'o'Books.

**Community / Desktop edition:**

Gig'o'Books is a client-side ReactJS webapp which runs in a system-provided webview. The [webview](https://github.com/bengtan/websqlview) is written in Go and provides access to sqlite and other native facilities. Hence, Gig'o'Books acts like native desktop software.

* Your data is stored in an sqlite file on your local filesystem.
* Gig'o'Books runs entirely offline and does not access the Internet.
* Data is stored in an sqlite database file. The schema and code are open so you can interact with your data yourself (if you so wish).
* The community edition (Gig'o'Books CE) is free and open source.
* It is intended to be cross-platform desktop (Windows/MacOS/Linux) although it has only been tested on MacOS and Ubuntu/libgtk so far. Windows should work but may require some tweaking.

**Web edition:**

There is a separate Web edition which is available at https://www.gigobooks.com/webapp

Despite being a webapp, it is non-SaaS, runs fully client-side and your data is stored in an sqlite file on your local filesystem.

The Web edition is very much like the Desktop edition except that it runs in a regular web browser.

## Status

Gig'o'Books is beta software that is suitable for production use. Remember to make backups of your data files (which, in the general case, you should be doing anyway).

## Links

* **Website and blog:** https://www.gigobooks.com
* **Web edition:** https://www.gigobooks.com/webapp

## Building

(Only tested on MacOS and Ubuntu Linux so far. It may require tweaks or small changes to work on Windows.)

Install dependencies:

* Install [Go](https://golang.org), [nodejs](https://nodejs.org) and [yarn](https://yarnpkg.com) on your system.
* Install and build `websqlview` from https://github.com/bengtan/websqlview.

Then, in the top level directory, run:

```
# This will install a bunch of components
yarn

# This will 'compile' into the `dist` subdirectory.
yarn webpack --mode=development
```

## Usage

(These instructions are for running in development mode.)

Run `websqlview` and point it to `dist/index.html`. For example:

```
websqlview dist/index.html
```

If you are making changes to the source code, you probably want to do:

```
yarn watch
```

and leave it running. This tells webpack to monitor changes and re-'compile' automatically.

The data file is a regular sqlite database. You can use any third-party sqlite client to open/read/write it. However, this is an advanced technique and you may corrupt the data. Only do this if you know what you are doing.

## Contributing

See [Contributing](CONTRIBUTING.md).

## License

* Gig'o'Books CE (community edition) - [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)

<!--
* Gig'o'Books Web (web edition) - Proprietary
* Gig'o'Books PE (premium edition) - [PolyForm Internal Use License 1.0.0](https://polyformproject.org/licenses/internal-use/1.0.0/)
-->
