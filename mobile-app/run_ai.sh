#!/bin/bash
adb="/Users/sanyogpc/Library/Android/sdk/platform-tools/adb -s emulator-5554"

# 1. Tap New Application
$adb shell input tap 172 1480
sleep 4

# 2. Tap Air Fryer
$adb shell input tap 270 1300
sleep 1

# 3. Tap US
$adb shell input tap 240 2220
sleep 1

# 4. Scroll down 3 times
for i in {1..3}; do
  $adb shell input swipe 600 2500 600 500
  sleep 1
done

# 5. Tap Analyze Requirements
$adb shell input tap 640 2165
sleep 5

# 6. Screenshot results
$adb exec-out screencap -p > screen.png
tesseract screen.png stdout
