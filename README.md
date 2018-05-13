# Markdown Viewer

A standalone application that renders and displays Markdown files. It does nothing else! No direct editing nor any fancy note taking features. It is not distributed as a browser extension nor does it fire up a web server - so no web browser is needed to see the rendered Markdown file.

## Developing

The tool is developed and tested only under Windows 10 yet.

Node.js including the NPM package manager is needed.

After cloning the Git repository type `npm install`. NPM may put some warnings while installing the packages.

To start an instance while development type `npm start`. You can open the Electron development tools by calling the main menu "Tools" -> "Developer tools" or by pressing the F10 key.

Binaries can be built by typing `npm run dist`. Under Windows, a ZIP package and a Setup.exe will be built. Other operating systems are not tested yet and there are properly some settings missing to build the proper packages. Pull requests are welcome.

The icon is made with help of [Inkscape](https://inkscape.org/en/) and [ImageMagick](https://www.imagemagick.org). While the application icon does not look too bad, a proper icon for Markdown *documents* is missing yet. Operating systems other than Windows are not regarded yet.

## Copyright and License

This tool is made by Christian Dreier. If you find a copy somewhere, you find the original at [GitHub](https://github.com/c3er/mdview).

You can use and copy this tool under the conditions of the MIT license.

## Todo

### Features / Bugs

Links that do not lead to locally stored Markdown files shall be opened in standard browser

External resources that are loaded from the Internet shall be blocked

A status bar showing the link destination of the link that is currently hovered by the mouse pointer
