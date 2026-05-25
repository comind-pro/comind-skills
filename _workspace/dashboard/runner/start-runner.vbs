' start-runner.vbs — Windows hidden launcher for the agentic-os runner.
'
' Drop this file into:
'   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
' so the runner auto-launches on every user login. No admin rights needed.
'
' Adjust the path below if you installed the runner outside
' ~/.claude/agentic-os-runner/.

Set WshShell = CreateObject("WScript.Shell")
Dim userProfile
userProfile = WshShell.ExpandEnvironmentStrings("%USERPROFILE%")
WshShell.Run "node.exe """ & userProfile & "\.claude\agentic-os-runner\runner.js""", 0, False
Set WshShell = Nothing
