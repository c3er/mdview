!macro customInstall
    Push $0
    FileOpen $0 "$INSTDIR\.datadir" w
    FileWrite $0 "MDVIEW_USER_DATA"
    FileClose $0
    Pop $0
!macroend
