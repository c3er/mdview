@echo off

:: It is assumed that ImageMagick is in the system path.
:: Download: https://www.imagemagick.org/script/download.php

set OCD=%cd%
cd %~dp0

magick convert master.png -resize 16x16 16.png
magick convert master.png -resize 32x32 32.png
magick convert master.png -resize 48x48 48.png
magick convert master.png -resize 256x256 256.png

magick convert 16.png 32.png 48.png 256.png md.ico

cd %OCD%
