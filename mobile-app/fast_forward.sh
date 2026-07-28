#!/bin/bash
adb="/Users/sanyogpc/Library/Android/sdk/platform-tools/adb -s emulator-5554"

$adb shell input tap 644 2558
sleep 2

$adb shell input tap 226 1203
sleep 1
$adb shell input tap 602 2679
sleep 2

$adb shell input tap 328 1055
sleep 1
$adb shell input tap 602 2679
sleep 2

$adb shell input tap 274 1051
sleep 1
$adb shell input tap 602 2679
sleep 2

$adb shell input tap 261 1034
sleep 1
$adb shell input tap 602 2679
sleep 2

$adb shell input tap 353 1302
sleep 1
$adb shell input tap 602 2679
sleep 2

$adb shell input tap 287 1056
sleep 1
$adb shell input tap 627 2680
sleep 4

$adb exec-out screencap -p > screen.png
tesseract screen.png stdout
