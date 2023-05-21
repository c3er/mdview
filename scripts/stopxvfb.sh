#!/bin/sh

# Based on script provided by https://kb.froglogic.com/squish/howto/using-squish-headless-systems/

kill `cat $HOME/.xvfb_xfwm4_1.pid`
rm $HOME/.xvfb_xfwm4_1.pid
