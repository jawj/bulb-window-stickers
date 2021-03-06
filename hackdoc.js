// Generated by CoffeeScript 1.12.2

/*
HackDoc -- client-side PDF generation
George MacKerron
https://github.com/jawj/hackdoc
 */
var PDFError, fontName, k, ligs, ref, v,
  slice = [].slice,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

PDFError = (function() {
  function PDFError(code, message) {
    this.code = code;
    this.message = message;
  }

  PDFError.codes = {
    PDF_INVALID: 1,
    IMAGE_INVALID: 2,
    IMAGE_UNSUPPORTED: 3,
    IMAGE_UNKNOWN: 4
  };

  return PDFError;

})();

this.PDFObj = (function() {
  PDFObj.create = function(pdf, opts) {
    return new this(pdf, opts);
  };

  function PDFObj(pdf, opts) {
    var ref;
    if (opts == null) {
      opts = {};
    }
    this.objNum = (ref = opts.num) != null ? ref : pdf.nextObjNum();
    this.ref = this.objNum + " 0 R";
    this.update(opts);
    pdf.addObj(this);
  }

  PDFObj.prototype.update = function(opts) {
    var j, len1, part, parts, ref, ref1, results;
    if (opts == null) {
      opts = {};
    }
    if (!((opts.parts != null) || (opts.data != null))) {
      return;
    }
    parts = (ref = opts.parts) != null ? ref : [opts.data];
    this.parts = ["\n" + this.objNum + " 0 obj\n"].concat(slice.call(parts), ["\nendobj\n"]);
    this.length = 0;
    ref1 = this.parts;
    results = [];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      part = ref1[j];
      results.push(this.length += part.length);
    }
    return results;
  };

  return PDFObj;

})();

this.PDFStream = (function(superClass) {
  extend(PDFStream, superClass);

  PDFStream.lzwEnc = function(input, earlyChange) {
    var allBitsWritten, bitsPerValue, bytesUsed, c, clear, dict, i, inString, j, keyPrefix, kpwc, len, maxValueWithBits, nextCode, output, ref, w, wc, write;
    if (earlyChange == null) {
      earlyChange = 1;
    }
    w = nextCode = dict = maxValueWithBits = null;
    inString = typeof input === 'string';
    output = new Uint8Array(input.length);
    allBitsWritten = 0;
    bitsPerValue = 9;
    keyPrefix = '#';
    write = function(value) {
      var bitPos, bitsToWrite, bytePos, newOutput, valueBitsWritten, writeValue;
      valueBitsWritten = 0;
      while (valueBitsWritten < bitsPerValue) {
        bytePos = Math.floor(allBitsWritten / 8);
        bitPos = allBitsWritten % 8;
        if (bytePos === output.length) {
          newOutput = new Uint8Array(output.length * 1.5);
          newOutput.set(output);
          output = newOutput;
        }
        if (bitPos > 0) {
          bitsToWrite = 8 - bitPos;
          writeValue = value >> (bitsPerValue - bitsToWrite);
          output[bytePos] |= writeValue;
        } else if ((bitsToWrite = bitsPerValue - valueBitsWritten) >= 8) {
          writeValue = (value >> (bitsToWrite - 8)) & 0xff;
          bitsToWrite = 8;
          output[bytePos] = writeValue;
        } else {
          writeValue = (value << (8 - bitsToWrite)) & 0xff;
          output[bytePos] |= writeValue;
        }
        valueBitsWritten += bitsToWrite;
        allBitsWritten += bitsToWrite;
      }
      return null;
    };
    clear = function() {
      w = '';
      nextCode = 0;
      dict = {};
      while (nextCode < 258) {
        dict[keyPrefix + String.fromCharCode(nextCode)] = nextCode;
        nextCode++;
      }
      write(256);
      bitsPerValue = 9;
      return maxValueWithBits = (1 << bitsPerValue) - earlyChange;
    };
    clear();
    len = input.length;
    for (i = j = 0, ref = len; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      c = inString ? input.charAt(i) : String.fromCharCode(input[i]);
      wc = w + c;
      kpwc = keyPrefix + wc;
      if (dict.hasOwnProperty(kpwc)) {
        w = wc;
      } else {
        dict[kpwc] = nextCode++;
        write(dict[keyPrefix + w]);
        w = c;
        if (nextCode > maxValueWithBits) {
          if (bitsPerValue === 12) {
            write(dict[keyPrefix + w]);
            clear();
          } else {
            bitsPerValue++;
            maxValueWithBits = (1 << bitsPerValue) - earlyChange;
          }
        }
      }
    }
    write(dict[keyPrefix + w]);
    write(257);
    bytesUsed = Math.ceil(allBitsWritten / 8);
    return output.subarray(0, bytesUsed);
  };

  function PDFStream(pdf, opts) {
    var filter, stream;
    if (opts == null) {
      opts = {};
    }
    stream = opts.stream;
    if (opts.minify) {
      stream = stream.replace(/%.*$/mg, '').replace(/\s*\n\s*/g, '\n');
    }
    filter = opts.lzw ? (stream = this.constructor.lzwEnc(stream), '\n/Filter /LZWDecode') : '';
    opts.parts = ["<<\n/Length " + stream.length + filter + "\n>>\nstream\n", stream, "\nendstream"];
    PDFStream.__super__.constructor.call(this, pdf, opts);
  }

  return PDFStream;

})(PDFObj);

this.PDFFont = (function(superClass) {
  extend(PDFFont, superClass);

  function PDFFont(pdf, opts) {
    opts.data = "<<\n/Type /Font \n/Subtype /Type1\n/BaseFont /" + opts.name + "\n/Encoding <<\n  /Type /Encoding\n  /BaseEncoding /MacRomanEncoding\n  /Differences [219 /Euro]\n  >>\n>>";
    PDFFont.__super__.constructor.call(this, pdf, opts);
  }

  return PDFFont;

})(PDFObj);

this.PDFText = (function() {
  function PDFText() {}

  PDFText.sanitize = function(s, fontName, rep, whitelist) {
    var c, i, j, ref, sanitized;
    if (rep == null) {
      rep = '_';
    }
    if (whitelist == null) {
      whitelist = '';
    }
    sanitized = '';
    for (i = j = 0, ref = s.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      c = s.charAt(i);
      sanitized += ((PDFMetrics.codes[c] != null) && (PDFMetrics.widths[fontName][c] != null)) || whitelist.indexOf(c) !== -1 ? c : rep;
    }
    return sanitized;
  };

  PDFText.ligaturize = function(s, fontName) {
    var k, re, ref, v;
    ref = PDFMetrics.ligatures[fontName];
    for (k in ref) {
      v = ref[k];
      re = new RegExp(k, 'g');
      s = s.replace(re, v);
    }
    return s;
  };

  PDFText.hexString = function(s, hex) {
    var i, j, ref;
    if (hex == null) {
      hex = '<';
    }
    for (i = j = 0, ref = s.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      hex += PDFMetrics.codes[s.charAt(i)];
    }
    return hex + '>';
  };

  PDFText.paragraphize = function(s) {
    return s.split(/\r\n|\r|\n/);
  };

  PDFText.wordify = function(s) {
    var words;
    words = s.match(/[^ —–-]*[—–-]? */g);
    words.pop();
    return words;
  };

  PDFText.widthify = function(words, fontName) {
    var TJData, char, charCount, charWidth, endWidth, i, j, kernWidth, kerning, len1, m, midWidth, nextChar, nextWord, nextWordChar, ref, ref1, results, seenSpace, spaceCount, str, widths, word;
    widths = PDFMetrics.widths[fontName];
    kerning = PDFMetrics.kerning[fontName];
    results = [];
    for (i = j = 0, len1 = words.length; j < len1; i = ++j) {
      word = words[i];
      nextWord = words[i + 1];
      nextWordChar = nextWord != null ? nextWord.charAt(0) : void 0;
      word += nextWordChar != null ? nextWordChar : ' ';
      midWidth = endWidth = charCount = spaceCount = 0;
      seenSpace = false;
      str = TJData = '';
      for (i = m = 0, ref = word.length - 1; 0 <= ref ? m < ref : m > ref; i = 0 <= ref ? ++m : --m) {
        char = word.charAt(i);
        nextChar = word.charAt(i + 1);
        seenSpace || (seenSpace = char === ' ');
        charWidth = widths[char];
        midWidth += charWidth;
        if (!seenSpace) {
          endWidth += charWidth;
        }
        charCount++;
        if (seenSpace) {
          spaceCount++;
        }
        str += char;
        kernWidth = (ref1 = kerning[char]) != null ? ref1[nextChar] : void 0;
        if (kernWidth != null) {
          TJData += (PDFText.hexString(str)) + " " + kernWidth + " ";
          str = '';
          midWidth -= kernWidth;
          if (!seenSpace) {
            endWidth -= kernWidth;
          }
        }
      }
      if (str.length > 0) {
        TJData += (PDFText.hexString(str)) + " ";
      }
      results.push({
        TJData: TJData,
        midWidth: midWidth,
        endWidth: endWidth,
        charCount: charCount,
        spaceCount: spaceCount
      });
    }
    return results;
  };

  PDFText.preprocessPara = function(s, fontName, ligatures) {
    var ligaturize;
    if (ligatures == null) {
      ligatures = true;
    }
    ligaturize = ligatures ? PDFText.ligaturize : noop;
    return PDFText.widthify(PDFText.wordify(ligaturize(PDFText.sanitize(s, fontName), fontName)), fontName);
  };

  PDFText.flowPara = function(para, fontSize, opts) {
    var TJData, charCount, charSpace, charSpaceFactor, charStretch, commands, finishLine, fix, height, i, j, leading, len1, line, lineData, linesData, minusLSpace, numLines, rSpace, ref, scale, scaledLineWidth, scaledMaxWidth, scaledWidth, spaceCount, stretchFactor, width, willExceedHeight, willWrap, word, wordSpace, wordSpaceFactor;
    if (opts == null) {
      opts = {};
    }
    if (opts.maxWidth == null) {
      opts.maxWidth = 2e308;
    }
    if (opts.maxHeight == null) {
      opts.maxHeight = 2e308;
    }
    if (opts.lineHeight == null) {
      opts.lineHeight = 1.3;
    }
    if (opts.align == null) {
      opts.align = 'left';
    }
    if (opts.justify == null) {
      opts.justify = {
        wordSpaceFactor: 0.45,
        charSpaceFactor: 0.40,
        stretchFactor: 0.15
      };
    }
    if (opts.hyphenate == null) {
      opts.hyphenate = false;
    }
    if (opts.hyphLength == null) {
      opts.hyphLength = 0.8;
    }
    scale = 1000 / fontSize;
    para = para.slice(0);
    scaledMaxWidth = opts.maxWidth * scale;
    leading = fontSize * opts.lineHeight;
    scaledWidth = height = scaledLineWidth = charCount = spaceCount = 0;
    line = [];
    linesData = [];
    fix = function(n) {
      return n.toFixed(3).replace(/\.?0+$/, '');
    };
    finishLine = function() {
      var lastWord;
      lastWord = line[line.length - 1];
      scaledLineWidth += lastWord.endWidth - lastWord.midWidth;
      if (opts.hyphenate && scaledLineWidth < opts.hyphLength * scaledMaxWidth) {
        console.log('hyphenate after: ', lastWord, 'hyphenate: ', word);
      }
      charCount -= lastWord.spaceCount;
      spaceCount -= lastWord.spaceCount;
      linesData.push({
        line: line,
        scaledLineWidth: scaledLineWidth,
        charCount: charCount,
        spaceCount: spaceCount
      });
      return height += leading;
    };
    while (para.length > 0) {
      word = para.shift();
      willWrap = scaledLineWidth + word.endWidth > scaledMaxWidth && line.length > 0;
      if (willWrap) {
        finishLine();
        willExceedHeight = height + leading > opts.maxHeight;
        if (willExceedHeight) {
          para.unshift(word);
          break;
        } else {
          line = [];
          scaledLineWidth = charCount = spaceCount = 0;
        }
      }
      line.push(word);
      scaledLineWidth += word.midWidth;
      charCount += word.charCount;
      spaceCount += word.spaceCount;
      if (para.length === 0) {
        finishLine();
      }
    }
    scaledWidth = 0;
    commands = (fix(leading)) + " TL 0 Tw 0 Tc 100 Tz\n";
    numLines = linesData.length;
    for (i = j = 0, len1 = linesData.length; j < len1; i = ++j) {
      lineData = linesData[i];
      line = lineData.line, scaledLineWidth = lineData.scaledLineWidth, charCount = lineData.charCount, spaceCount = lineData.spaceCount;
      if (scaledLineWidth > scaledWidth) {
        scaledWidth = scaledLineWidth;
      }
      rSpace = scaledMaxWidth - scaledLineWidth;
      minusLSpace = (function() {
        switch (opts.align) {
          case 'right':
            return fix(-rSpace) + ' ';
          case 'centre':
          case 'center':
            return fix(-rSpace / 2) + ' ';
          default:
            return '';
        }
      })();
      if (opts.align === 'full') {
        if (i === numLines - 1 && rSpace >= 0) {
          wordSpace = charSpace = 0;
          charStretch = 100;
        } else {
          ref = opts.justify, wordSpaceFactor = ref.wordSpaceFactor, charSpaceFactor = ref.charSpaceFactor, stretchFactor = ref.stretchFactor;
          if (spaceCount === 0) {
            wordSpace = 0;
            charSpaceFactor *= 1 / (1 - wordSpaceFactor);
            stretchFactor *= 1 / (1 - wordSpaceFactor);
          } else {
            wordSpace = wordSpaceFactor * rSpace / spaceCount / scale;
          }
          charSpace = charSpaceFactor * rSpace / (charCount - 1) / scale;
          charStretch = 100 / (1 - (rSpace * stretchFactor / scaledMaxWidth));
        }
        commands += (fix(wordSpace)) + " Tw " + (fix(charSpace)) + " Tc " + (fix(charStretch)) + " Tz ";
      }
      TJData = (function() {
        var len2, m, results;
        results = [];
        for (m = 0, len2 = line.length; m < len2; m++) {
          word = line[m];
          results.push(word.TJData);
        }
        return results;
      })();
      commands += "[ " + minusLSpace + (TJData.join('').replace(/> </g, '')) + "] TJ T*\n";
    }
    width = scaledWidth / scale;
    if (opts.align === 'full' && scaledMaxWidth / scale < width) {
      width = scaledMaxWidth / scale;
    }
    return {
      commands: commands,
      para: para,
      width: width,
      height: height
    };
  };

  return PDFText;

})();

this.HackDoc = (function() {
  HackDoc.zeroPad = function(n, len) {
    var str, zeroes;
    zeroes = '0000000000';
    str = '' + n;
    return zeroes.substring(0, len - str.length) + str;
  };

  HackDoc.randomId = function() {
    var i;
    return ((function() {
      var j, results;
      results = [];
      for (i = j = 0; j <= 31; i = ++j) {
        results.push(Math.floor(Math.random() * 15.99).toString(16));
      }
      return results;
    })()).join('');
  };

  function HackDoc(basePDFArrBufOrVersion, opts) {
    var header, r, trailer, trailerPos;
    if (basePDFArrBufOrVersion == null) {
      basePDFArrBufOrVersion = '1.4';
    }
    if (opts == null) {
      opts = {};
    }
    this.objs = [];
    this.id = HackDoc.randomId();
    this.appending = typeof basePDFArrBufOrVersion === 'string' ? (header = "%PDF-" + basePDFArrBufOrVersion + "\n", !opts.nonBinary ? header += "%\u0080\u07ff\n" : void 0, header += "      \n% welcome, view-sourceror!\n% this PDF has been lovingly handcrafted using http://github.com/jawj/hackdoc\n", this.basePDF = new Blob([header]), this.baseLen = this.basePDF.size, this.nextFreeObjNum = 1, false) : (this.basePDF = new Uint8Array(basePDFArrBufOrVersion), this.baseLen = this.basePDF.length, trailerPos = function(pdf) {
      var a, char, e, i, l, pos, r, ref, t;
      ref = (function() {
        var j, len1, ref, results;
        ref = 'traile'.split('');
        results = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          char = ref[j];
          results.push(char.charCodeAt(0));
        }
        return results;
      })(), t = ref[0], r = ref[1], a = ref[2], i = ref[3], l = ref[4], e = ref[5];
      pos = pdf.length;
      while (--pos >= 6) {
        if (pdf[pos] === r && pdf[pos - 1] === e && pdf[pos - 2] === l && pdf[pos - 3] === i && pdf[pos - 4] === a && pdf[pos - 5] === r && pdf[pos - 6] === t) {
          return pos;
        }
      }
    }, r = new Uint8ArrayReader(this.basePDF), trailer = r.seek(trailerPos(this.basePDF)).binString(), this.nextFreeObjNum = +trailer.match(/\s+\/Size\s+(\d+)\s+/)[1], this.root = trailer.match(/\s+\/Root\s+(\d+ \d+ R)\s+/)[1], this.info = trailer.match(/\s+\/Info\s+(\d+ \d+ R)\s+/)[1], this.prevId = trailer.match(/\s+\/ID\s+\[\s*<([0-9a-f]+)>\s+/i)[1], this.baseStartXref = +trailer.match(/(\d+)\s+%%EOF\s+$/)[1], true);
  }

  HackDoc.prototype.nextObjNum = function() {
    return this.nextFreeObjNum++;
  };

  HackDoc.prototype.addObj = function(obj) {
    if (indexOf.call(this.objs, obj) < 0) {
      return this.objs.push(obj);
    }
  };

  HackDoc.prototype.toBlob = function() {
    var allParts, bodyParts, consecutiveObjSets, currentSet, j, lastObjNum, len1, len2, len3, m, o, objOffset, os, p, q, ref, ref1, trailer, trailerPart, u8, xref;
    this.objs.sort(function(a, b) {
      return a.objNum - b.objNum;
    });
    bodyParts = (ref = []).concat.apply(ref, (function() {
      var j, len1, ref, results;
      ref = this.objs;
      results = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        o = ref[j];
        results.push(o.parts);
      }
      return results;
    }).call(this));
    consecutiveObjSets = [];
    lastObjNum = null;
    ref1 = this.objs;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      o = ref1[j];
      if (!((lastObjNum != null) && o.objNum === lastObjNum + 1)) {
        consecutiveObjSets.push((currentSet = []));
      }
      currentSet.push(o);
      lastObjNum = o.objNum;
    }
    xref = "\nxref\n0 1\n0000000000 65535 f \n";
    objOffset = this.baseLen;
    for (m = 0, len2 = consecutiveObjSets.length; m < len2; m++) {
      os = consecutiveObjSets[m];
      xref += os[0].objNum + " " + os.length + "\n";
      for (q = 0, len3 = os.length; q < len3; q++) {
        o = os[q];
        xref += (HackDoc.zeroPad(objOffset, 10)) + " 00000 n \n";
        objOffset += o.length;
      }
    }
    trailerPart = this.appending ? "/Prev " + this.baseStartXref + "\n/ID [<" + this.prevId + "> <" + this.id + ">]" : "/ID [<" + this.id + "> <" + this.id + ">]";
    if (this.info) {
      trailerPart += "\n/Info " + this.info;
    }
    trailer = "\ntrailer\n<<\n" + trailerPart + "\n/Root " + this.root + "\n/Size " + this.nextFreeObjNum + "\n>>\n\nstartxref\n" + objOffset + "\n%%EOF";
    allParts = [this.basePDF].concat(slice.call(bodyParts), [xref], [trailer]);
    if (new Blob([new Uint8Array(0)]).size !== 0) {
      allParts = (function() {
        var len4, results, u;
        results = [];
        for (u = 0, len4 = allParts.length; u < len4; u++) {
          p = allParts[u];
          if (p.buffer != null) {
            if (p.length === p.buffer.byteLength) {
              results.push(p.buffer);
            } else {
              u8 = new Uint8Array(p.length);
              u8.set(p);
              results.push(u8.buffer);
            }
          } else {
            results.push(p);
          }
        }
        return results;
      })();
    }
    return new Blob(allParts, {
      type: 'application/pdf'
    });
  };

  HackDoc.prototype.linkAsync = function(filename, cb) {
    var blob, fr;
    blob = this.toBlob();
    if (window.URL != null) {
      return cb(make({
        tag: 'a',
        href: URL.createObjectURL(blob),
        onclick: function() {
          if (navigator.msSaveOrOpenBlob != null) {
            navigator.msSaveOrOpenBlob(blob, filename);
            return false;
          }
        }
      }));
    } else {
      fr = new FileReader();
      fr.readAsDataURL(blob);
      return fr.onload = function() {
        return cb(make({
          tag: 'a',
          href: fr.result,
          onclick: function() {
            if (navigator.appVersion.indexOf('Safari') !== -1) {
              return false;
            }
          }
        }));
      };
    }
  };

  return HackDoc;

})();

PDFMetrics.ligatureRegExps = {};

ref = PDFMetrics.ligatures;
for (fontName in ref) {
  ligs = ref[fontName];
  PDFMetrics.ligatureRegExps[fontName] = (function() {
    var results;
    results = [];
    for (k in ligs) {
      v = ligs[k];
      results.push({
        re: new RegExp(k, 'g'),
        lig: v
      });
    }
    return results;
  })();
}

//# sourceMappingURL=hackdoc.js.map
