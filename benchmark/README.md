# Turbyoot Benchmarks

## Installation

You will need to install [wrk](https://github.com/wg/wrk/blob/master/INSTALL) in order to run the benchmarks.

Make sure the framework is built before running benchmarks:

```bash
npm run build
```

## Running

To run the benchmarks, first install the dependencies `npm i`, build the framework (`npm run build`), then run `make`

The output will look something like this:

```
  50 connections
  1 middleware
 7.15ms
 6784.01

 [...]

  1000 connections
  10 middleware
 139.21ms
 6155.19

```

### Tip: Include Node.js version in output

You can use `make && node -v` to include the node.js version in the output.

### Tip: Save the results to a file

You can use `make > results.log` to save the results to a file `results.log`.