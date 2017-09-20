
###
HackDoc -- client-side PDF generation
George MacKerron
https://github.com/jawj/hackdoc
###

# PDF ref: http://wwwimages.adobe.com/www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/PDF32000_2008.pdf

class PDFError
  constructor: (@code, @message) -> # nowt
  @codes =
    PDF_INVALID:        1
    IMAGE_INVALID:      2
    IMAGE_UNSUPPORTED:  3
    IMAGE_UNKNOWN:      4

class @PDFObj
  @create = (pdf, opts) -> new @(pdf, opts)
  
  constructor: (pdf, opts = {}) ->
    @objNum = opts.num ? pdf.nextObjNum()
    @ref = "#{@objNum} 0 R"
    @update opts
    pdf.addObj @
  
  update: (opts = {}) ->
    return unless opts.parts? or opts.data?
    parts = opts.parts ? [opts.data]
    @parts = ["\n#{@objNum} 0 obj\n", parts..., "\nendobj\n"]
    @length = 0
    (@length += part.length) for part in @parts
  

class @PDFStream extends PDFObj
  @lzwEnc = (input, earlyChange = 1) ->
    w = nextCode = dict = maxValueWithBits = null  # scope
    inString = typeof input is 'string'
    output = new Uint8Array input.length
    allBitsWritten = 0
    bitsPerValue = 9  # used to write CLEAR in first call to clear()
    keyPrefix = '#'   # so that compressing repeated 'hasOwnProperty', '__proto__' etc. is OK
    
    write = (value) ->  # writes 9- to 12-bit values
      valueBitsWritten = 0
      while valueBitsWritten < bitsPerValue
        bytePos = Math.floor(allBitsWritten / 8)
        bitPos = allBitsWritten % 8
        if bytePos is output.length  # we're overflowing our ArrayBuffer, so make a bigger one
          newOutput = new Uint8Array (output.length * 1.5)
          newOutput.set output
          output = newOutput
        if bitPos > 0  # writing at right of byte
          bitsToWrite = 8 - bitPos
          writeValue = value >> (bitsPerValue - bitsToWrite)
          output[bytePos] |= writeValue
        else if (bitsToWrite = bitsPerValue - valueBitsWritten) >= 8  # writing a whole byte
          writeValue = (value >> (bitsToWrite - 8)) & 0xff
          bitsToWrite = 8
          output[bytePos] = writeValue
        else  # writing at left of byte
          writeValue = (value << (8 - bitsToWrite)) & 0xff
          output[bytePos] |= writeValue
        valueBitsWritten += bitsToWrite
        allBitsWritten += bitsToWrite
      null
    
    clear = ->
      w = ''
      nextCode = 0
      dict = {}
      while nextCode < 258
        dict[keyPrefix + String.fromCharCode nextCode] = nextCode
        nextCode++
      write 256  # CLEAR, using old bitsPerValue
      bitsPerValue = 9
      maxValueWithBits = (1 << bitsPerValue) - earlyChange
    
    clear()
    
    len = input.length
    for i in [0...len]
      c = if inString then input.charAt i else String.fromCharCode input[i]
      wc = w + c
      kpwc = keyPrefix + wc
      if dict.hasOwnProperty kpwc
        w = wc
      else
        dict[kpwc] = nextCode++
        write dict[keyPrefix + w]
        w = c
        if nextCode > maxValueWithBits
          if bitsPerValue is 12
            write dict[keyPrefix + w]
            clear()
          else
            bitsPerValue++
            maxValueWithBits = (1 << bitsPerValue) - earlyChange
    
    write dict[keyPrefix + w]
    write 257  # EOD
    bytesUsed = Math.ceil(allBitsWritten / 8)
    output.subarray 0, bytesUsed
  
  constructor: (pdf, opts = {}) ->
    # opts: minify, lzw
    stream = opts.stream
    stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n') if opts.minify  # removes comments and blank lines
    filter = if opts.lzw
      stream = @constructor.lzwEnc stream
      '\n/Filter /LZWDecode'
    else ''
    opts.parts = ["""
      <<
      /Length #{stream.length}#{filter}
      >>
      stream\n""", stream, "\nendstream"]
    
    super pdf, opts
  

class @PDFFont extends PDFObj
  constructor: (pdf, opts) ->
    opts.data = """
      <<
      /Type /Font 
      /Subtype /Type1
      /BaseFont /#{opts.name}
      /Encoding <<
        /Type /Encoding
        /BaseEncoding /MacRomanEncoding
        /Differences [219 /Euro]
        >>
      >>"""
    super pdf, opts
  

class @PDFText
  @sanitize = (s, fontName, rep = '_', whitelist = '') ->
    sanitized = ''
    for i in [0...s.length]
      c = s.charAt i
      sanitized += if (PDFMetrics.codes[c]? and PDFMetrics.widths[fontName][c]?) or whitelist.indexOf(c) isnt -1 then c else rep
    sanitized
  
  @ligaturize = (s, fontName) ->
    for k, v of PDFMetrics.ligatures[fontName]
      re = new RegExp k, 'g'
      s = s.replace re, v
    s
  
  @hexString = (s, hex = '<') ->
    for i in [0...s.length]
      hex += PDFMetrics.codes[s.charAt i]
    hex + '>'
  
  @paragraphize = (s) -> s.split /\r\n|\r|\n/
  @wordify = (s) -> 
    words = s.match /[^ —–-]*[—–-]? */g
    words.pop()  # since last match always empty
    words
  
  @widthify = (words, fontName) ->
    widths = PDFMetrics.widths[fontName]
    kerning = PDFMetrics.kerning[fontName]
    
    for word, i in words
      nextWord = words[i + 1]
      nextWordChar = nextWord?.charAt(0)
      word += nextWordChar ? ' '
      
      midWidth = endWidth = charCount = spaceCount = 0
      seenSpace = no
      str = TJData = ''
      
      for i in [0...(word.length - 1)]  # exclude final char, which is part of next word (or a space)
        char = word.charAt i
        nextChar = word.charAt(i + 1)
        
        seenSpace ||= char is ' '
        charWidth = widths[char]
        midWidth += charWidth 
        endWidth += charWidth unless seenSpace
        charCount++
        spaceCount++ if seenSpace
        
        str += char
        
        kernWidth = kerning[char]?[nextChar]
        if kernWidth?
          TJData += "#{PDFText.hexString str} #{kernWidth} "
          str = ''
          midWidth -= kernWidth
          endWidth -= kernWidth unless seenSpace
      
      TJData += "#{PDFText.hexString str} " if str.length > 0
      {TJData, midWidth, endWidth, charCount, spaceCount}
  
  @preprocessPara = (s, fontName, ligatures = yes) ->  
    ligaturize = if ligatures then PDFText.ligaturize else noop  # NB. disable ligatures if using full justification
    PDFText.widthify(PDFText.wordify(ligaturize(PDFText.sanitize(s, fontName), fontName)), fontName)
  
  @flowPara = (para, fontSize, opts = {}) ->
    opts.maxWidth   ?= Infinity
    opts.maxHeight  ?= Infinity
    opts.lineHeight ?= 1.3
    opts.align      ?= 'left'  # or 'right', 'centre', 'full' (in which case, remember: disable ligatures)
    opts.justify    ?= {wordSpaceFactor: 0.45, charSpaceFactor: 0.40, stretchFactor: 0.15}
    opts.hyphenate  ?= no
    opts.hyphLength ?= 0.8
    
    scale = 1000 / fontSize
    
    para = para[0..]  # copy
    scaledMaxWidth = opts.maxWidth * scale
    leading = fontSize * opts.lineHeight
    scaledWidth = height = scaledLineWidth = charCount = spaceCount = 0
    line = []
    linesData = []
    
    fix = (n) -> n.toFixed(3).replace /\.?0+$/, ''
    finishLine = ->
      lastWord = line[line.length - 1]
      scaledLineWidth += lastWord.endWidth - lastWord.midWidth
      
      # hyphenate
      if opts.hyphenate and scaledLineWidth < opts.hyphLength * scaledMaxWidth
        console.log 'hyphenate after: ', lastWord, 'hyphenate: ', word
        
      
      charCount -= lastWord.spaceCount
      spaceCount -= lastWord.spaceCount
      linesData.push {line, scaledLineWidth, charCount, spaceCount}
      height += leading
    
    while para.length > 0
      word = para.shift()
      willWrap = scaledLineWidth + word.endWidth > scaledMaxWidth and line.length > 0
      if willWrap
        finishLine()
        willExceedHeight = height + leading > opts.maxHeight
        if willExceedHeight
          para.unshift word
          break
        else
          line = []
          scaledLineWidth = charCount = spaceCount = 0
          
      line.push word
      scaledLineWidth += word.midWidth
      charCount += word.charCount
      spaceCount += word.spaceCount
      
      finishLine() if para.length is 0
    
    scaledWidth = 0
    commands = "#{fix leading} TL 0 Tw 0 Tc 100 Tz\n"
    numLines = linesData.length
    for lineData, i in linesData
      {line, scaledLineWidth, charCount, spaceCount} = lineData
      scaledWidth = scaledLineWidth if scaledLineWidth > scaledWidth
      rSpace = scaledMaxWidth - scaledLineWidth
      minusLSpace = switch opts.align
        when 'right' then fix(- rSpace) + ' '
        when 'centre', 'center' then fix(- rSpace / 2) + ' '
        else ''  # left and full
      if opts.align is 'full'
        if i is numLines - 1 and rSpace >= 0  # do nothing to last line unless too long
          wordSpace = charSpace = 0
          charStretch = 100
        else
          {wordSpaceFactor, charSpaceFactor, stretchFactor} = opts.justify
          if spaceCount is 0  # reapportion factors if there are no spaces (avoids / 0)
            wordSpace = 0
            charSpaceFactor *= 1 / (1 - wordSpaceFactor)
            stretchFactor   *= 1 / (1 - wordSpaceFactor)
          else
            wordSpace = wordSpaceFactor * rSpace / spaceCount / scale
          charSpace = charSpaceFactor * rSpace / (charCount - 1) / scale
          charStretch = 100 / (1 - (rSpace * stretchFactor / scaledMaxWidth))
        commands += "#{fix wordSpace} Tw #{fix charSpace} Tc #{fix charStretch} Tz "
      
      TJData = (word.TJData for word in line)
      commands += "[ #{minusLSpace}#{TJData.join('').replace /> </g, ''}] TJ T*\n"
    
    width = scaledWidth / scale
    width = scaledMaxWidth / scale if opts.align is 'full' and scaledMaxWidth / scale < width
    {commands, para, width, height}


class @HackDoc
  @zeroPad = (n, len) ->
    zeroes = '0000000000'  # for len up to 10
    str = '' + n
    zeroes.substring(0, len - str.length) + str
  
  @randomId = ->
    (Math.floor(Math.random() * 15.99).toString(16) for i in [0..31]).join ''
  
  constructor: (basePDFArrBufOrVersion = '1.4', opts = {}) ->
    @objs = []
    @id = HackDoc.randomId()
    @appending = if typeof basePDFArrBufOrVersion is 'string'
      header = "%PDF-#{basePDFArrBufOrVersion}\n"
      if not opts.nonBinary then header += "%\u0080\u07ff\n"  # these 2 unicode chars in utf8 -> 4 bytes >= 128
      header += """
      
        % welcome, view-sourceror!
        % this PDF has been lovingly handcrafted using http://github.com/jawj/hackdoc

      """
      @basePDF = new Blob [header]  
      @baseLen = @basePDF.size
      @nextFreeObjNum = 1
      # @root must (and @info may) be set to obj refs manually
      no
      
    else
      @basePDF = new Uint8Array basePDFArrBufOrVersion
      @baseLen = @basePDF.length
      
      trailerPos = (pdf) ->
        [t, r, a, i, l, e] = (char.charCodeAt(0) for char in 'traile'.split '')
        pos = pdf.length
        while (--pos >= 6)
          return pos if pdf[pos] is r and pdf[pos - 1] is e and pdf[pos - 2] is l and 
            pdf[pos - 3] is i and pdf[pos - 4] is a and pdf[pos - 5] is r and pdf[pos - 6] is t
      
      r = new Uint8ArrayReader @basePDF
      trailer = r.seek(trailerPos @basePDF).binString()
      
      @nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1]
      @root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1]
      @info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1]
      @prevId = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1]
      @baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1]
      yes
  
  nextObjNum: -> @nextFreeObjNum++
  addObj: (obj) -> @objs.push obj unless obj in @objs
  toBlob: () ->
    @objs.sort (a, b) -> a.objNum - b.objNum
    bodyParts = [].concat (o.parts for o in @objs)...
    
    consecutiveObjSets = []
    lastObjNum = null
    for o in @objs
      consecutiveObjSets.push (currentSet = []) unless lastObjNum? and o.objNum is lastObjNum + 1
      currentSet.push o
      lastObjNum = o.objNum
    xref = """
      \nxref
      0 1
      0000000000 65535 f \n"""
    objOffset = @baseLen
    for os in consecutiveObjSets
      xref += "#{os[0].objNum} #{os.length}\n"
      for o in os
        xref += "#{HackDoc.zeroPad objOffset, 10} 00000 n \n"
        objOffset += o.length
    
    trailerPart = if @appending
      """
      /Prev #{@baseStartXref}
      /ID [<#{@prevId}> <#{@id}>]
      """
    else
      "/ID [<#{@id}> <#{@id}>]"
    
    trailerPart += "\n/Info #{@info}" if @info
    
    trailer = """\ntrailer
      <<
      #{trailerPart}
      /Root #{@root}
      /Size #{@nextFreeObjNum}
      >>
      
      startxref
      #{objOffset}
      %%EOF
    """
    
    allParts = [@basePDF, bodyParts..., xref, trailer]
    
    if new Blob([new Uint8Array 0]).size isnt 0  # Safari helpfully adds a Uint8Array to Blob as '[object Uint8Array]'
      allParts = for p in allParts
        if p.buffer?  # not worried about strings etc.
          if p.length is p.buffer.byteLength then p.buffer  # view is of whole of backing buffer, just use that
          else  # arrayview is a subarray with a larger backing buffer, so need to create a smaller one
            u8 = new Uint8Array p.length
            u8.set p
            u8.buffer
        else p
    
    new Blob allParts, type: 'application/pdf'
  
  linkAsync: (filename, cb) ->
    blob = @toBlob()
    if window.URL?
      cb make tag: 'a', href: URL.createObjectURL(blob), onclick: ->
        if navigator.msSaveOrOpenBlob?
          navigator.msSaveOrOpenBlob blob, filename
          return no
    else
      fr = new FileReader()
      fr.readAsDataURL blob
      fr.onload = ->
        cb make tag: 'a', href: fr.result, onclick: ->
          return no if navigator.appVersion.indexOf('Safari') isnt -1  # Safari crashes on clicking a long data URI


PDFMetrics.ligatureRegExps = {}
for fontName, ligs of PDFMetrics.ligatures
  PDFMetrics.ligatureRegExps[fontName] = for k, v of ligs
    {re: new RegExp(k, 'g'), lig: v}

