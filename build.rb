#!/usr/bin/env ruby

# note: sudo npm install -g clean-css html-minifier

require 'nokogiri'

def pipe cmd, stdin
  IO.popen(cmd, 'w+') { |io| io.write(stdin); io.close_write; io.read }
end

def dataURIFor url
  return url if url.match(%r{^data:|//$}) || ! url.match(/\.(gif|jpg|jpeg|png)$/i) || ! File.exist?(url) || File.size(url) > 2 ** 15 - 1  # IE8 32KB limit 
  fileext = url.match(/[^.]+$/)[0]
  content = open(url, 'rb') { |f| f.read }
  puts " - inlining #{url}"
  "data:image/#{fileext};base64,#{[content].pack 'm0'}"
end

doc = Nokogiri::HTML File.open 'source.html'


# CSS

allcss = []
doc.css('link[rel="stylesheet"]').each do |tag|
  href = tag.attributes['href'].value
  puts "\n#{href}"
  next if href.match %r{^data:|//}
  css = File.read href
  puts ' - minify'
  css = pipe 'cleancss', css
  css.gsub!(%r{(?<=url\()[^)]+(?=\))}) { |url| dataURIFor url }
  tag.remove
  allcss << css
end
doc.css('head').first.add_child %{<style>#{allcss.join "\n"}</style>}


# JS

alljs = []
doc.css('script').each do |tag|
  src_att = tag.attributes['src']
  js = if src_att
    src = src_att.value
    next if src.match %r{//}  # don't touch remote scripts
    puts "\n#{src}"
    File.read src
  else
    puts "\nLocal JS"
    tag.text
  end
  tag.remove
  alljs << js
end
minjs = pipe 'java -jar /usr/local/closure-compiler/compiler.jar --compilation_level SIMPLE', alljs.join(";\n")
doc.css('body').first.last_element_child.add_next_sibling %{<script>#{minjs}</script>}


# Images

doc.css('img[src]').each do |tag|
  src = tag.attributes['src'].value
  puts "\n#{src}"
  tag.attributes['src'].value = dataURIFor(src)
end

puts "\nInline styles"
doc.css('*[style]').each do |tag|
  style = tag.attributes['style'].value
  style.gsub!(%r{(?<=url\()[^)]+(?=\))}) { |url| dataURIFor url }
  tag.attributes['style'].value = style
end


# HTML

html = pipe 'html-minifier --remove-comments --collapse-whitespace --remove-redundant-attributes', doc.to_html
open('docs/index.html', 'w') { |f| f.write html }
