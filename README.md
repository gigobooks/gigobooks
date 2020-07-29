# GigoBooks

* Clean and simple accounting software for solopreneurs, consultants, freelancers and other micro-businesses.
* Privacy focused desktop software. Not cloud-based SaaS. Retain control over your data.
* Open data format. No lock-in. Retain control over your data.
* Source code that you can extend/hack/customise yourself. Write your own custom scripts.
* Double entry bookkeeping
* Multi currency
* [**Try out the DEMO**](https://gigobooks.github.io/demo)

Technical stuff:

GigoBooks is a client-side ReactJS webapp which runs in a system-provided webview. The [webview](https://github.com/bengtan/websqlview) is written in Go. It provides access to sqlite and other native facilities. Hence, GigoBooks acts like native desktop software.

* Your data is stored in an sqlite file on your local filesystem.
* GigoBooks runs entirely offline and does not access the Internet.
* Data is stored in an sqlite database file. The schema and code are open so you can interact with your data yourself (if you so wish).
* The community edition (GigoBooks CE) is free and open source.
* It is intended to be cross-platform desktop (Windows/MacOS/Linux) although it has only been developed and tested on Ubuntu/libgtk so far. Other platforms may or may not yet work.

NOTE: This is alpha/preview quality software and **IS NOT READY TO BE USED IN PRODUCTION**. You have been warned.

## Blog

https://gigobooks.github.io/

## DEMO

https://gigobooks.github.io/demo

## Building

(Only tested on Ubuntu Linux so far. It might work on Windows and MacOS, or it might not.)

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

Run `websqlview` and point it to `index.html` of the top level directory as a file:/// URL. For example:

```
websqlview file:///<path-to-top-level-directory>/index.html
```

If you are making frequent changes to the source code, you probably want to do:

```
yarn watch
```

and leave it running. This tells webpack to monitor changes and re-'compile' automatically.

The data file is a regular sqlite database. You can use any third-party sqlite client to open/read/write it. However, this is an advanced technique and you may corrupt the data. Only do this if you know what you are doing.

## Contributing

See [Contributing](CONTRIBUTING.md).

## Commentary on business model, licensing, monetisation and related topics

This software is commercially motivated. In other words, the hope is that it will become first: financially self-sustainable, and then second: profitable.

It started out as a side project during the Coronavirus/COVID-19 pandemic of 2020. I wrote it because it was something I could use. However, it soon grew into something quite substantial and I wondered whether there might be a market for it. In other words, would other people want to use it, but also, be willing to pay money for it? Because if so, then I could continue working on it and turn it into something (hopefully) great. Only one way to find out.

So, currently, this is a side project ... that's trying to be a real commercial project. If it doesn't become real, then that's fine. I'll just write the features I need, and then move on to do other things. However, if I can get revenue and funding, then I can continue to spend time on it, improve it, and see where it takes us.

With that historical background, here's the plan:

The business model is going to be 'open core'. The entry-level/core edition of GigoBooks will be free and open source. Advanced features or add-ons will be in a premium edition and be paid-for. Note that **THE PREMIUM EDITION IS NOT OPEN SOURCE**.

The entry-level and premium editions are called GigoBooks CE (community edition) and GigoBooks PE (premium edition) respectively.

For now, here are the planned monetisation tiers (names are temporary and unofficial):

* Level 0 - Free - Access to GigoBooks CE repository and source code. Compile it yourself. Community supported.
* Level 1 - Purchase the GigoBooks PE binary through an app store for $N (unsure what N is yet).
* Level 2 - (Subscription?) Access to GigoBooks PE repository, source code, issues queue etc. Access to GigoBooks PE binary. Vendor support.

Note that this is only a plan and comes with some caveats.

* This plan could change as new insights come to light. It will probably change. The question is not 'whether' but 'by how much'.
* GigoBooks CE hasn't been completed yet. It's just alpna/beta software at the moment.
* Hence, level 1 does not yet exist.
* Level 2 also does not exist yet. For now, it's no more than just some speculative thoughts.

(However, some more thoughts about level 2 ... I'm thinking of implementing level 2 via github sponsors which would be a subscription/recurring thing. Although GigoBooks PE does not yet exist, a repository could be created and sponsors can submit (ie. via the GigoBooks PE issue queue) feedback and feature requests. Github sponsors would be an experiment and I have no idea how it will turn out. Some more thinking and pondering needed here.)

How will I decide what features go into CE and what features are restricted to PE? I don't know yet. There's too many unknowns to be able to say but I will try to strike a balance. 

In general, as more and more features go into PE, simpler or older features will 'trickle down' from PE to CE.

## License

* GigoBooks CE (community edition) - [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)
* GigoBooks PE (premium edition) - [PolyForm Internal Use License 1.0.0](https://polyformproject.org/licenses/internal-use/1.0.0/)
