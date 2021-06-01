# Contributing to Markdown Viewer

Notes:

- Markdown Viewer is referred to as "the tool" below.
- The project maintainer is referred to as "the author" below

## Bugs and feature requests

If the tool does not behave as expected in any way or you miss some feature, you may want to [report an issue](https://github.com/c3er/mdview/issues/new/choose). When reporting ensure following points:

- Do you have [the latest version](https://github.com/c3er/mdview/releases/latest)?
- Is the issue [already reported](https://github.com/c3er/mdview/issues?q=)?
    - If an issue exists and is still open, you may give it a thumbs up reaction as signal to the tool author.
    - A closed issue may be closed, because a bug is fixed only seemingly or the author did not consider the reported behavior or missing feature as to be fixed
        - **Seemingly fixed bug:** feel free to reopen the issue and provide additional information (see below)
        - **Issues not considered to be fixed:** you may provide some additional arguments, why the author was wrong at not fixing this issue🙂
- The issue provides all needed information (see below)

### Needed information

For missing features and "strange behavior", the author needs a good description of the expected behavior.

For things like exception messages, application crashes or non working menu points, following information is helpful:

- Exact steps to reproduce the bug
- Operating system
    - For Windows, the version should be sufficient, e.g. "20H2". If you are not sure, which exact version you have, press the key combination `Win+R` and type `winver`.
    - On Linux just all the information about your environment that may be appropriate🙂

## Code contribution

If you like to add some feature or fix an apparent bug, it is recommended to open an issue explaining the change first. This makes it possible to discuss the feature or bug fix first and makes sure that you don't put to much work in the case that the author does not want that particular change to his tool.

Use GitHub's [pull request mechanism](https://github.com/c3er/mdview/compare) to propose your contribution.

Please ensure following points:

- All automated tests pass by running `npm test`
    - If a test fails after a fresh clone/checkout on your machine (i.e. without any changes by you), it is very clearly a bug and should be reported with all needed information about your environment.
- The code is formatted properly by running `npm run format`
- Your changes do not have any merge conflicts with the current state of the master branch
- For your convenience it is recommended that you make your changes not on the master branch but on an extra feature branch
