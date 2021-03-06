// Generated by CoffeeScript 1.12.2
var makePDF, matches,
  slice = [].slice;

makePDF = function(url, callback) {
  var boldFontName, boldFontObj, bottomTextBottomY, bottomTextY, c, contentStream, controlPoint, coord, current, fakeCanvas, fixFloat, fontName, fontObj, fontSizeBig, fontSizeSmall, fontSizeTiny, h, j, k, leftMargin, len, len1, lineHeightBig, lineHeightSmall, linkObj, linkRect, linkText, logoCmds, logoSVG, logoSection, logoT, ltPink, mm2pt, nextToken, pageObj, pageSize, pagesObj, path, pathArr, pathStr, pdf, pink, prev, prevControlPoint, prevCoord, qr, qrCmds, qrMarginBlocks, qrScale, qrSection, qrT, ref, ref1, rootObj, roundRect, scaleSection, scaleT, textLine, textSection, textX, token, topTextY, v, viewbox, viewboxArr, viewboxStr, w, x, y;
  pdf = new HackDoc('1.4', {
    nonBinary: true
  });
  fixFloat = (function(_this) {
    return function(n, dp) {
      if (dp == null) {
        dp = 3;
      }
      return parseFloat(n.toFixed(dp));
    };
  })(this);
  mm2pt = function(mm) {
    return fixFloat(mm / 25.4 * 72);
  };
  Transform.prototype.cmd = function() {
    return (fixFloat(this.m[0])) + " " + (fixFloat(this.m[1])) + " " + (fixFloat(this.m[2])) + " " + (fixFloat(this.m[3])) + " " + (fixFloat(this.m[4])) + " " + (fixFloat(this.m[5])) + " cm  % transform";
  };
  Transform.prototype.transformSeq = function(inpts) {
    var i, j, outpts, ref, ref1, ref2, x, xprime, y, yprime;
    outpts = [];
    for (i = j = 0, ref = inpts.length; j < ref; i = j += 2) {
      ref1 = inpts.slice(i, i + 2), x = ref1[0], y = ref1[1];
      ref2 = this.transformPoint(x, y), xprime = ref2[0], yprime = ref2[1];
      outpts.push(fixFloat(xprime), fixFloat(yprime));
    }
    return outpts;
  };
  pageSize = {
    w: mm2pt(210),
    h: mm2pt(297)
  };
  pink = '0.765 0.259 0.549';
  ltPink = '0.976 0.925 0.953';
  qrScale = 9;
  qrMarginBlocks = 4;
  leftMargin = pageSize.w / 18;
  fontName = 'Helvetica';
  fontObj = PDFFont.create(pdf, {
    name: fontName
  });
  boldFontName = 'Helvetica-Bold';
  boldFontObj = PDFFont.create(pdf, {
    name: boldFontName
  });
  fontSizeBig = 48;
  lineHeightBig = 0.90;
  fontSizeSmall = 24;
  lineHeightSmall = 1.1;
  fontSizeTiny = 8;
  scaleT = new Transform();
  scaleT.translate(0, 375);
  scaleT.scale(0.75, 0.75);
  scaleSection = "% === transform to top of portrait A4 (plus draw the dotted line + credit) ===\n\nq  % save\n0.5 0.5 0.5 RG  % stroke colour (RGB)\n0.5 w  % line width\n[2] 0 d  % dash\n0 538 m\n" + pageSize.w + " 538 l\nS  % stroke the path\nQ  % restore\n\n0.5 0.5 0.5 rg  % fill colour (RGB)\nBT\n20 525 TD  % move to start point\n/F1 " + fontSizeTiny + " Tf  % set font\n" + (PDFText.flowPara(PDFText.preprocessPara('Created at ' + location.host + location.pathname, fontName), fontSizeTiny).commands) + "\nET\n\n" + (scaleT.cmd());
  qrCmds = '';
  fakeCanvas = {
    width: null,
    height: null,
    getContext: function() {
      var fakeCtx, startX;
      startX = null;
      return fakeCtx = {
        fillStyle: null,
        fillRect: function(x, y, w, h) {
          if (fakeCtx.fillStyle === '#FFFFFF') {
            if (startX != null) {
              qrCmds += startX + " " + y + " " + (x - startX) + " " + h + " re\n";
            }
            return startX = null;
          } else {
            if (startX == null) {
              return startX = x;
            }
          }
        }
      };
    }
  };
  qr = qrcodegen.QrCode.encodeText(url, qrcodegen.QrCode.Ecc.HIGH);
  qr.drawCanvas(1, qrMarginBlocks, fakeCanvas);
  qrT = new Transform();
  qrT.translate(leftMargin, pageSize.h / 2);
  qrT.scale(qrScale, -qrScale);
  qrT.translate(0, -fakeCanvas.height / 2);
  qrSection = "% === QR code ===\n\nq  % save\n" + (qrT.cmd()) + "\n" + pink + " rg  % fill color (RGB)\n" + qrCmds + "\nf  % fill the path\nQ  % restore";
  logoSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 76.2 141.7 53.8" width="100" height="38"><path d="M22.9,102.3C34,91.4,39.2,82,37.7,79.2c0,0-7.6,6.4-11.1,20.3c-3.6,14.6-1.4,25.5,8.3,27.3c7.5,1.4,15-5.3,16.6-14.3c1.9-9.8-3.6-15.1-10.8-13.8c-7.4,1.3-10.1,10-10.1,10s10.5-11.2,23.8-11.2c10.7,0,11.4,2,11.4,2c-4.3,11.2-7.6,22.8-1,26.5c7.5,4.2,16.5-7.2,19.3-12.8s5.3-15.1,3.5-13.5s-4,9.2-4.2,13.1c-0.2,4-0.6,12.2,7,13.2c8.3,1.1,18.8-15.2,23.5-26.3c4.5-10.9,5.4-20.4,2.7-20.4s-8.5,8.2-11.7,20.1c-6.1,23.3,4.5,30.2,11.6,26.7c6.9-3.7,19.8-15.4,23.8-27.4c3.4-10.3,5-19.4,2.2-19.4c-3.4,0-8.9,10.1-11.7,20.4s-1.1,26.2,11.2,27.2c7,0.6,13.6-5.7,15.7-12.5c2.6-8.3-0.3-14.9-7.6-14.9c-6.8,0-9.9,7.3-9.9,7.3" class="line" style="fill: none; stroke: #C3428C; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round;"></path></svg>';
  viewboxStr = logoSVG.match(/viewBox="([^"]+)"/i)[1];
  viewboxArr = viewboxStr.match(/-?\d*\.?\d+/gi);
  ref = (function() {
    var j, len, results;
    results = [];
    for (j = 0, len = viewboxArr.length; j < len; j++) {
      v = viewboxArr[j];
      results.push(parseFloat(v));
    }
    return results;
  })(), x = ref[0], y = ref[1], w = ref[2], h = ref[3];
  viewbox = {
    x: x,
    y: y,
    w: w,
    h: h
  };
  pathStr = logoSVG.match(/d="([^"]+)"/i)[1];
  pathArr = pathStr.match(/[a-z]|-?\d*\.?\d+/gi);
  path = [];
  current = prev = null;
  while ((token = pathArr.shift())) {
    if (token.match(/[a-z]/i)) {
      prev = current;
      current = {
        cmd: token,
        coords: []
      };
      path.push(current);
    } else {
      nextToken = pathArr.shift();
      coord = {
        x: parseFloat(token),
        y: parseFloat(nextToken)
      };
      if (current.cmd.match(/[a-z]/)) {
        prevCoord = prev.coords[prev.coords.length - 1];
        coord.x += prevCoord.x;
        coord.y += prevCoord.y;
      }
      if (current.cmd.match(/s/i) && current.coords.length === 0) {
        prevCoord = prev.coords[prev.coords.length - 1];
        prevControlPoint = prev.coords[prev.coords.length - 2];
        controlPoint = {
          x: prevCoord.x + (prevCoord.x - prevControlPoint.x),
          y: prevCoord.y + (prevCoord.y - prevControlPoint.y)
        };
        current.coords.push(controlPoint);
      }
      current.coords.push(coord);
    }
  }
  logoCmds = '';
  for (j = 0, len = path.length; j < len; j++) {
    c = path[j];
    ref1 = c.coords;
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      coord = ref1[k];
      logoCmds += fixFloat(coord.x) + ' ' + fixFloat(coord.y) + ' ';
    }
    if (c.cmd.match(/m/i)) {
      logoCmds += 'm\n';
    } else if (c.cmd.match(/c|s/i)) {
      logoCmds += 'c\n';
    }
  }
  logoT = new Transform();
  logoT.translate(leftMargin + fakeCanvas.width * qrScale / 2 + 3.5, pageSize.h / 2);
  logoT.scale(1.2, -1.2);
  logoT.translate(-viewbox.x - viewbox.w / 2, -viewbox.y - viewbox.h / 2);
  logoSection = "% === bulb logo ===\n\nq  % save\n" + (logoT.cmd()) + "\n1 j  % round line join\n1 J  % round line cap\n\n21 w  % line width\n1 1 1 RG  % stroke color (RGB)\n" + logoCmds + "\nS  % stroke the path (thick white)\n\n6 w  % line width\n" + pink + " RG  % stroke color (RGB)\n" + logoCmds + "\nS  % stroke the path (thinner pink)\n\nQ  % restore";
  textX = fixFloat(leftMargin + fakeCanvas.width * qrScale);
  topTextY = fixFloat(pageSize.h / 2 + fakeCanvas.height * ((fakeCanvas.height - qrMarginBlocks * 2) / fakeCanvas.height) * qrScale / 2 - fontSizeBig + 10);
  bottomTextBottomY = fixFloat(pageSize.h / 2 - fakeCanvas.height * ((fakeCanvas.height - qrMarginBlocks * 2) / fakeCanvas.height) * qrScale / 2);
  bottomTextY = bottomTextBottomY + fontSizeSmall * lineHeightSmall * 3;
  textLine = function(text, big, bold) {
    return PDFText.flowPara(PDFText.preprocessPara(text, bold ? boldFontName : fontName), big ? fontSizeBig : fontSizeSmall, {
      lineHeight: big ? lineHeightBig : lineHeightSmall
    });
  };
  linkText = textLine(url.replace(/^https?:\/\//, ''), false, false);
  linkRect = [textX - 6, fixFloat(bottomTextBottomY + fontSizeSmall * lineHeightSmall) - 3, fixFloat(textX + linkText.width) + 6, fixFloat(bottomTextBottomY) - 6];
  roundRect = function(radius, x1, y1, x2, y2) {
    return (x2 - radius) + " " + y1 + " m\n" + (x2 - radius / 2) + " " + y1 + " " + x2 + " " + (y1 - radius / 2) + " " + x2 + " " + (y1 - radius) + " c\n" + x2 + " " + (y2 + radius) + " l\n" + x2 + " " + (y2 + radius / 2) + " " + (x2 - radius / 2) + " " + y2 + " " + (x2 - radius) + " " + y2 + " c\n" + (x1 + radius) + " " + y2 + " l\n" + (x1 + radius / 2) + " " + y2 + " " + x1 + " " + (y2 + radius / 2) + " " + x1 + " " + (y2 + radius) + " c\n" + x1 + " " + (y1 - radius) + " l\n" + x1 + " " + (y1 - radius / 2) + " " + (x1 + radius / 2) + " " + y1 + " " + (x1 + radius) + " " + y1 + " c\nh";
  };
  textSection = "% === text ===\n\nq  % save\n\n" + ltPink + " rg  % fill color (RGB)\n" + (roundRect.apply(null, [7].concat(slice.call(linkRect)))) + "\nf\n\n" + pink + " rg  % fill color (RGB)\n\nBT  % begin text\n" + textX + " " + topTextY + " TD  % move to start point\n/F2 " + fontSizeBig + " Tf  % set font\n" + (textLine('100%', true, true).commands) + "\n" + (textLine('renewable', true, true).commands) + "\n" + (textLine('electricity', true, true).commands) + "\n/F1 " + fontSizeBig + " Tf  % set font\n" + (textLine('inside', true, false).commands) + "\nET  % end text\n\nBT  % begin text\n" + textX + " " + bottomTextY + " TD  % move to start point\n/F2 " + fontSizeSmall + " Tf  % set font\n" + (textLine('One low tariff', false, true).commands) + "\n" + (textLine('and £50 for both of us', false, true).commands) + "\n/F1 " + fontSizeSmall + " Tf  % set font\n" + (textLine('when you switch via this link:', false, false).commands) + "\n" + linkText.commands + "\nET  % end text\n\nQ  % restore";
  linkObj = PDFObj.create(pdf, {
    data: "<<\n  /Type /Annot\n  /Subtype /Link\n  /Rect [ " + (scaleT.transformSeq(linkRect).join(' ')) + " ]\n  /Border [ 0 0 0 ]\n  /A <<\n    /Type /Action\n    /S /URI\n    /URI (" + url + ")\n  >>\n>>"
  });
  contentStream = PDFStream.create(pdf, {
    lzw: false,
    minify: false,
    stream: [scaleSection, qrSection, logoSection, textSection].join('\n\n')
  });
  pagesObj = PDFObj.create(pdf);
  pageObj = PDFObj.create(pdf, {
    data: "<<\n  /Type /Page\n  /Parent " + pagesObj.ref + "\n  /Resources <<\n    /Font <<\n      /F1 " + fontObj.ref + " \n      /F2 " + boldFontObj.ref + "\n    >>\n  >>\n  /Contents " + contentStream.ref + "\n  /Annots [ " + linkObj.ref + " ]\n>>"
  });
  pagesObj.update({
    data: "<<\n  /Type /Pages\n  /MediaBox [ 0 0 " + pageSize.w + " " + pageSize.h + " ]\n  /Count 1\n  /Kids [ " + pageObj.ref + " ]\n>>"
  });
  rootObj = PDFObj.create(pdf, {
    data: "  <<\n  /Type /Catalog\n  /Pages " + pagesObj.ref + "\n>>"
  });
  pdf.root = rootObj.ref;
  return pdf.linkAsync('bulb_refer.pdf', function(link) {
    return callback(link);
  });
};

if ((matches = unescape(location.search).match(/\breferral=(http:\/\/bulb.co.uk\/refer\/[^\b]+)/))) {
  makePDF(matches[1], function(link) {
    var bareURL;
    bareURL = location.href.replace(/\?.*$/, '');
    if (window.history && history.replaceState) {
      history.replaceState(null, 'safelygoback', bareURL);
    }
    link.style.display = 'none';
    get({
      tag: 'body'
    }).appendChild(link);
    return link.click();
  });
}

window.addEventListener('load', function() {
  return get({
    id: 'referral'
  }).focus();
});

//# sourceMappingURL=script.js.map
