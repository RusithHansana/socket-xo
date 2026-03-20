# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - button "Back to Lobby" [ref=e5] [cursor=pointer]
    - generic [ref=e6]:
      - generic [ref=e7]:
        - paragraph [ref=e8]: Solo Match
        - heading "Play the full game against the AI" [level=1] [ref=e9]
      - paragraph [ref=e10]: Every move is validated on the server, and the AI answers with the next authoritative state.
    - region "Player identities" [ref=e11]:
      - group "Player Player-0464, playing as X, waiting" [ref=e12]:
        - generic [ref=e14]:
          - generic [ref=e15]: Player-0464
          - generic [ref=e16]: X
      - group "Player AI Opponent, playing as O, active" [ref=e17]:
        - generic [ref=e19]:
          - generic [ref=e20]: AI Opponent
          - generic [ref=e21]: O
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]: Opponent's Turn
        - generic [ref=e25]: Opponent's Turn
      - grid "Tic-Tac-Toe game board" [ref=e27]:
        - row "Row 1, Column 1, X Row 1, Column 2, empty Row 1, Column 3, empty" [ref=e28]:
          - gridcell "Row 1, Column 1, X" [active] [ref=e29] [cursor=pointer]:
            - img [ref=e31]
          - gridcell "Row 1, Column 2, empty" [ref=e34] [cursor=pointer]
          - gridcell "Row 1, Column 3, empty" [ref=e35] [cursor=pointer]
        - row "Row 2, Column 1, empty Row 2, Column 2, empty Row 2, Column 3, empty" [ref=e36]:
          - gridcell "Row 2, Column 1, empty" [ref=e37] [cursor=pointer]
          - gridcell "Row 2, Column 2, empty" [ref=e38] [cursor=pointer]
          - gridcell "Row 2, Column 3, empty" [ref=e39] [cursor=pointer]
        - row "Row 3, Column 1, empty Row 3, Column 2, empty Row 3, Column 3, empty" [ref=e40]:
          - gridcell "Row 3, Column 1, empty" [ref=e41] [cursor=pointer]
          - gridcell "Row 3, Column 2, empty" [ref=e42] [cursor=pointer]
          - gridcell "Row 3, Column 3, empty" [ref=e43] [cursor=pointer]
```