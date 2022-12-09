# xmi-mermaid

xmi-mermaid is a conversion tool for turning xmi sequence diagrams into mermaid format, particularly for use in Github.

Initially, it will ONLY handle sequence diagrams. 

## Instructions

1. Clone repo
2. Install node modules `npm install`
3. Export Visual Paradigm project conatining Sequence Diagrams as XMI. 
  - Name file however you want: <filename>.xml
4. Copy XMI file into root of this project
5. Update the `inFileName` variable in `converter.js` to be this XMI file you just copied into the root
6. Run xmi to mermaid converter. `node converter.js`

