# GigoBooks

* Clean and simple accounting software for solopreneurs, consultants, freelancers and other micro-businesses.
* Privacy focused desktop software. Not cloud-based SaaS. Retain control over your data.
* Open data format. No lock-in. Retain control over your data.
* Source code that you can extend/hack/customise yourself. Write your own custom scripts.
* Double entry bookkeeping
* Multi currency
* [**Try it out on the web**](https://gigobooks.github.io/webapp)

**Technical stuff / Desktop edition:**

GigoBooks is a client-side ReactJS webapp which runs in a system-provided webview. The [webview](https://github.com/bengtan/websqlview) is written in Go. It provides access to sqlite and other native facilities. Hence, GigoBooks acts like native desktop software.

* Your data is stored in an sqlite file on your local filesystem.
* GigoBooks runs entirely offline and does not access the Internet.
* Data is stored in an sqlite database file. The schema and code are open so you can interact with your data yourself (if you so wish).
* The community edition (GigoBooks CE) is free and open source.
* It is intended to be cross-platform desktop (Windows/MacOS/Linux) although it has only been tested on MacOS and Ubuntu/libgtk so far. Windows should work but may require some tweaking.

**Web edition:**

There is a separate Web edition which runs on the web. However, it runs fully client-side and your data is stored in an sqlite file on your local filesystem.

## Status

GigoBooks is beta software and is suitable for production use. Remember to make backups of your data files (which, in the general case, you should be doing anyway).

## Links

* **Blog:** https://gigobooks.github.io/
* **Web edition:** https://gigobooks.github.io/webapp (Try it out!)

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

* GigoBooks CE (community edition) - [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)
* GigoBooks Web (web edition) - Proprietary
* GigoBooks PE (premium edition) - [PolyForm Internal Use License 1.0.0](https://polyformproject.org/licenses/internal-use/1.0.0/)

For some background, see https://www.gigobooks.com/blog/commentary-business-model.html
