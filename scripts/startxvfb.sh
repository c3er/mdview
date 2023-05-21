#!/bin/sh

# Based on script provided by https://kb.froglogic.com/squish/howto/using-squish-headless-systems/

xvfb-run --server-num=1 --server-args="-ac -screen 0 1280x1024x24" dbus-run-session xfwm4 &
PID=$!
sleep 4

XFWM4PID=`pstree -T -p $PID | grep xfwm4 | sed 's/^.*xfwm4.*(\([0-9]\+\))/\1/'`
echo $XFWM4PID > $HOME/.xvfb_xfwm4_1.pid
