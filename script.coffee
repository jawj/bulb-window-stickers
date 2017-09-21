
makePDF = (url, callback) ->

  pdf = new HackDoc('1.4', nonBinary: yes)

  # === hand-craft a PDF file ===

  fixFloat = (n, dp = 3) => parseFloat(n.toFixed(dp))
  mm2pt = (mm) -> fixFloat(mm / 25.4 * 72)
  Transform::cmd = -> "#{fixFloat(@m[0])} #{fixFloat(@m[1])} #{fixFloat(@m[2])} #{fixFloat(@m[3])} #{fixFloat(@m[4])} #{fixFloat(@m[5])} cm  % transform"
  Transform::transformSeq = (inpts) ->
    outpts = []
    for i in [0...inpts.length] by 2
      [x, y] = inpts.slice(i, i + 2)
      [xprime, yprime] = @transformPoint(x, y)
      outpts.push(fixFloat(xprime), fixFloat(yprime))
    outpts

  pageSize = w: mm2pt(210), h: mm2pt(297)
  pink = '0.765 0.259 0.549'
  ltPink = '0.976 0.925 0.953'
  qrScale = 9
  qrMarginBlocks = 4
  leftMargin = pageSize.w / 18

  fontName = 'Helvetica'
  fontObj = PDFFont.create pdf, name: fontName
  boldFontName = 'Helvetica-Bold'
  boldFontObj = PDFFont.create pdf, name: boldFontName

  fontSizeBig = 48
  lineHeightBig = 0.90
  fontSizeSmall = 24
  lineHeightSmall = 1.1
  fontSizeTiny = 8

  
  # === transform to portrait ===

  scaleT = new Transform()
  scaleT.translate(0, 375)  # correct transform parameters via trial and error ...
  scaleT.scale(0.75, 0.75)
  scaleSection = """
    % === transform to top of portrait A4 (plus draw the dotted line + credit) ===
    
    q  % save
    0.5 0.5 0.5 RG  % stroke colour (RGB)
    0.5 w  % line width
    [2] 0 d  % dash
    0 538 m
    #{pageSize.w} 538 l
    S  % stroke the path
    Q  % restore

    0.5 0.5 0.5 rg  % fill colour (RGB)
    BT
    20 525 TD  % move to start point
    /F1 #{fontSizeTiny} Tf  % set font
    #{PDFText.flowPara(PDFText.preprocessPara('Created at ' + location.host + location.pathname, fontName), fontSizeTiny).commands}
    ET

    #{scaleT.cmd()}
  """

  # === QR code ===

  qrCmds = ''
  fakeCanvas =  # we masquerade as a <canvas> while outputting PDF drawing commands (and coalescing horizontally adjacent blocks)
    width: null  # this value will be overwritten by the QR code library
    height: null  # ditto
    getContext: ->
      startX = null  # scoping
      fakeCtx =
        fillStyle: null  # this value will be repeatedly overwritten by the QR code library
        fillRect: (x, y, w, h) -> 
          if fakeCtx.fillStyle is '#FFFFFF'  # => end of dark rectangle (note: since there's a margin, we always get white at end of the line)
            if startX? then qrCmds += "#{startX} #{y} #{x - startX} #{h} re\n"
            startX = null
          else
            if not startX? then startX = x

  qr = qrcodegen.QrCode.encodeText(url, qrcodegen.QrCode.Ecc.HIGH)
  qr.drawCanvas(1, qrMarginBlocks, fakeCanvas)

  qrT = new Transform()
  qrT.translate(leftMargin, pageSize.h / 2)
  qrT.scale(qrScale, -qrScale)
  qrT.translate(0, -fakeCanvas.height / 2)

  qrSection = """
    % === QR code ===

    q  % save
    #{qrT.cmd()}
    #{pink} rg  % fill color (RGB)
    #{qrCmds}
    f  % fill the path
    Q  % restore
  """

  # === bulb logo ===

  logoSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 76.2 141.7 53.8" width="100" height="38"><path d="M22.9,102.3C34,91.4,39.2,82,37.7,79.2c0,0-7.6,6.4-11.1,20.3c-3.6,14.6-1.4,25.5,8.3,27.3c7.5,1.4,15-5.3,16.6-14.3c1.9-9.8-3.6-15.1-10.8-13.8c-7.4,1.3-10.1,10-10.1,10s10.5-11.2,23.8-11.2c10.7,0,11.4,2,11.4,2c-4.3,11.2-7.6,22.8-1,26.5c7.5,4.2,16.5-7.2,19.3-12.8s5.3-15.1,3.5-13.5s-4,9.2-4.2,13.1c-0.2,4-0.6,12.2,7,13.2c8.3,1.1,18.8-15.2,23.5-26.3c4.5-10.9,5.4-20.4,2.7-20.4s-8.5,8.2-11.7,20.1c-6.1,23.3,4.5,30.2,11.6,26.7c6.9-3.7,19.8-15.4,23.8-27.4c3.4-10.3,5-19.4,2.2-19.4c-3.4,0-8.9,10.1-11.7,20.4s-1.1,26.2,11.2,27.2c7,0.6,13.6-5.7,15.7-12.5c2.6-8.3-0.3-14.9-7.6-14.9c-6.8,0-9.9,7.3-9.9,7.3" class="line" style="fill: none; stroke: #C3428C; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round;"></path></svg>'

  viewboxStr = logoSVG.match(/viewBox="([^"]+)"/i)[1]
  viewboxArr = viewboxStr.match(/-?\d*\.?\d+/gi)
  [x, y, w, h] = (parseFloat(v) for v in viewboxArr)
  viewbox = {x, y, w, h}

  pathStr = logoSVG.match(/d="([^"]+)"/i)[1]
  pathArr = pathStr.match(/[a-z]|-?\d*\.?\d+/gi)

  # now convert logo path commands (= very limited subset of SVG) to PDF path commands

  path = []
  current = prev = null  # scoping
  while (token = pathArr.shift())
    if token.match(/[a-z]/i)
      prev = current
      current = {cmd: token, coords: []}
      path.push(current)
    else
      nextToken = pathArr.shift()
      coord = 
        x: parseFloat(token)
        y: parseFloat(nextToken)
      # lowercase commands => relative coords, convert to absolute
      if current.cmd.match(/[a-z]/)
        prevCoord = prev.coords[prev.coords.length - 1]
        coord.x += prevCoord.x
        coord.y += prevCoord.y
      # s and S commands => first control point is last control point reflected
      if current.cmd.match(/s/i) and current.coords.length is 0
        prevCoord = prev.coords[prev.coords.length - 1]
        prevControlPoint = prev.coords[prev.coords.length - 2]
        controlPoint =
          x: prevCoord.x + (prevCoord.x - prevControlPoint.x)
          y: prevCoord.y + (prevCoord.y - prevControlPoint.y)
        current.coords.push(controlPoint)
      # add this point
      current.coords.push(coord)

  logoCmds = ''
  for c in path
    for coord in c.coords
      logoCmds += fixFloat(coord.x) + ' ' + fixFloat(coord.y) + ' '
    if c.cmd.match(/m/i)
      logoCmds += 'm\n'
    else if c.cmd.match(/c|s/i)
      logoCmds += 'c\n'

  logoT = new Transform()
  logoT.translate(leftMargin + fakeCanvas.width * qrScale / 2 + 3.5, pageSize.h / 2)
  logoT.scale(1.2, -1.2)
  logoT.translate(-viewbox.x - viewbox.w / 2, -viewbox.y - viewbox.h / 2)

  logoSection = """
    % === bulb logo ===

    q  % save
    #{logoT.cmd()}
    1 j  % round line join
    1 J  % round line cap

    21 w  % line width
    1 1 1 RG  % stroke color (RGB)
    #{logoCmds}
    S  % stroke the path (thick white)

    6 w  % line width
    #{pink} RG  % stroke color (RGB)
    #{logoCmds}
    S  % stroke the path (thinner pink)

    Q  % restore
  """

  # === text + link ===

  textX = fixFloat(leftMargin + fakeCanvas.width * qrScale)
  topTextY = fixFloat(pageSize.h / 2 + 
    fakeCanvas.height * ((fakeCanvas.height - qrMarginBlocks * 2) / fakeCanvas.height) * qrScale / 2 - 
    fontSizeBig + 10)
  bottomTextBottomY = fixFloat(pageSize.h / 2 - 
    fakeCanvas.height * ((fakeCanvas.height - qrMarginBlocks * 2) / fakeCanvas.height) * qrScale / 2)
  bottomTextY = bottomTextBottomY + fontSizeSmall * lineHeightSmall * 3  # 3 = 4 - 1 lines of text

  textLine = (text, big, bold) -> PDFText.flowPara(
    PDFText.preprocessPara(text, if bold then boldFontName else fontName), 
    if big then fontSizeBig else fontSizeSmall, 
    lineHeight: if big then lineHeightBig else lineHeightSmall
  )

  linkText = textLine(url.replace(/^https?:\/\//, ''), no, no)

  linkRect = [
    textX - 6  # x1
    fixFloat(bottomTextBottomY + fontSizeSmall * lineHeightSmall) - 3  # y1
    fixFloat(textX + linkText.width) + 6  # x2
    fixFloat(bottomTextBottomY) - 6  # y2
  ]

  # rounded rect with bezier corners (not true arcs)
  roundRect = (radius, x1, y1, x2, y2) -> """
    #{x2 - radius} #{y1} m
    #{x2 - radius / 2} #{y1} #{x2} #{y1 - radius / 2} #{x2} #{y1 - radius} c
    #{x2} #{y2 + radius} l
    #{x2} #{y2 + radius / 2} #{x2 - radius / 2} #{y2} #{x2 - radius} #{y2} c
    #{x1 + radius} #{y2} l
    #{x1 + radius / 2} #{y2} #{x1} #{y2 + radius / 2} #{x1} #{y2 + radius} c
    #{x1} #{y1 - radius} l
    #{x1} #{y1 - radius / 2} #{x1 + radius / 2} #{y1} #{x1 + radius} #{y1} c
    h
  """

  textSection = """
    % === text ===

    q  % save

    #{ltPink} rg  % fill color (RGB)
    #{roundRect(7, linkRect ...)}
    f

    #{pink} rg  % fill color (RGB)

    BT  % begin text
    #{textX} #{topTextY} TD  % move to start point
    /F2 #{fontSizeBig} Tf  % set font
    #{textLine('100%', yes, yes).commands}
    #{textLine('renewable', yes, yes).commands}
    #{textLine('electricity', yes, yes).commands}
    /F1 #{fontSizeBig} Tf  % set font
    #{textLine('inside', yes, no).commands}
    ET  % end text

    BT  % begin text
    #{textX} #{bottomTextY} TD  % move to start point
    /F2 #{fontSizeSmall} Tf  % set font
    #{textLine('One low tariff', no, yes).commands}
    #{textLine('and £50 for both of us', no, yes).commands}
    /F1 #{fontSizeSmall} Tf  % set font
    #{textLine('when you switch via this link:', no, no).commands}
    #{linkText.commands}
    ET  % end text

    Q  % restore
  """

  linkObj = PDFObj.create pdf, data: """<<
    /Type /Annot
    /Subtype /Link
    /Rect [ #{scaleT.transformSeq(linkRect).join(' ')} ]
    /Border [ 0 0 0 ]
    /A <<
      /Type /Action
      /S /URI
      /URI (#{url})
    >>
  >>"""

  # === put it all together ===

  contentStream = PDFStream.create pdf, lzw: no, minify: no, stream: [
    scaleSection
    qrSection
    logoSection
    textSection
  ].join('\n\n')

  # data-free declaration of pagesObj to break circular ref
  pagesObj = PDFObj.create pdf

  pageObj = PDFObj.create pdf, data: """<<
    /Type /Page
    /Parent #{pagesObj.ref}
    /Resources <<
      /Font <<
        /F1 #{fontObj.ref} 
        /F2 #{boldFontObj.ref}
      >>
    >>
    /Contents #{contentStream.ref}
    /Annots [ #{linkObj.ref} ]
  >>"""

  # now update pagesObj with data
  pagesObj.update data: """<<
    /Type /Pages
    /MediaBox [ 0 0 #{pageSize.w} #{pageSize.h} ]
    /Count 1
    /Kids [ #{pageObj.ref} ]
  >>"""

  rootObj = PDFObj.create pdf, data: """
    <<
    /Type /Catalog
    /Pages #{pagesObj.ref}
  >>"""

  pdf.root = rootObj.ref
  pdf.linkAsync 'bulb_refer.pdf', (link) -> callback(link)


if (matches = unescape(location.search).match(/\breferral=(http:\/\/bulb.co.uk\/refer\/[^\b]+)/))
  makePDF matches[1], (link) ->
    bareURL = location.href.replace(/\?.*$/, '')
    if window.history and history.replaceState then history.replaceState(null, 'safelygoback', bareURL)
    link.style.display = 'none'
    get(tag: 'body').appendChild(link)  # Firefox won't click() a link that's not in the document
    link.click()

window.addEventListener 'load', -> 
  get(id: 'referral').focus()
