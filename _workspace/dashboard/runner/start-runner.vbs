' start-runner.vbs — Windows hidden launcher for the comind-dashboard runner.
'
' Drop this file into:
'   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
' so the runner auto-launches on every user login. No admin rights needed.
'
' Adjust the path below if you installed the runner outside
' ~/.claude/comind-dashboard-runner/.

Set WshShell = CreateObject("WScript.Shell")
Dim userProfile
userProfile = WshShell.ExpandEnvironmentStrings("%USERPROFILE%")
WshShell.Run "node.exe """ & userProfile & "\.claude\comind-dashboard-runner\runner.js""", 0, False
Set WshShell = Nothing
