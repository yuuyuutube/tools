// Export all 22 current Sunburst colour plates as editable Light Paint projects.
// macOS: swiftc -O scripts/export-light-paint.swift -o /tmp/export-light-paint
//        /tmp/export-light-paint /absolute/path/to/tarot-drawer
import AppKit
import CryptoKit

let root=URL(fileURLWithPath:CommandLine.arguments.count>1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("docs/tarot-sunburst/light-paint")
try FileManager.default.createDirectory(at:out,withIntermediateDirectories:true)
let cardText=try String(contentsOf:root.appendingPathComponent("src/data/cards.js"),encoding:.utf8)
let pattern=try NSRegularExpression(pattern:#"card\((\d+), '[^']*', '([^']+)', '([^']+)'"#)
let ns=cardText as NSString
let cards=pattern.matches(in:cardText,range:NSRange(location:0,length:ns.length))
precondition(cards.count==22)
let W=1024,H=1536
let inkRGB=[30,40,74], paper=[246.0,239.0,224.0]
let pigment=[[232.0,183.0,77.0],[222.0,83.0,43.0],[62.0,112.0,150.0],[30.0,40.0,74.0]]
func bitmap()->NSBitmapImageRep {NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:W,pixelsHigh:H,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bitmapFormat:.alphaNonpremultiplied,bytesPerRow:W*4,bitsPerPixel:32)!}
func png(_ b:NSBitmapImageRep)->Data {b.representation(using:.png,properties:[:])!}
func sha(_ d:Data)->String {SHA256.hash(data:d).map{String(format:"%02x",$0)}.joined()}
func hex(_ rgb:[Int])->String {"#"+rgb.map{String(format:"%02x",$0)}.joined()}
var manifest:[[String:Any]]=[]
var tiles=""
for match in cards {
 let n=Int(ns.substring(with:match.range(at:1)))!, id=ns.substring(with:match.range(at:2)), name=ns.substring(with:match.range(at:3))
 let prefix=String(format:"%02d",n)+"-"+id
 let source=n==0 ? "docs/tarot-sunburst/fool-pipeline/fool" : String(format:"docs/tarot-sunburst/batch-%02d/%d",(n-1)/3+1,n)
 var paths:[String]=[],sourceHashes:[String:String]=[:]
 let plates=try ["Y","O","B","N"].map { key -> NSBitmapImageRep in
  let path=source+"-"+key+"-source.png",data=try Data(contentsOf:root.appendingPathComponent(path));paths.append(path);sourceHashes[path]=sha(data)
  guard let b=NSBitmapImageRep(data:data),b.pixelsWide==W,b.pixelsHigh==H,b.bitsPerSample==8,b.samplesPerPixel>=3,!b.isPlanar else {fatalError("Unsupported source: \(path)")};return b
 }
 let flat=bitmap(),ink=bitmap(),preview=bitmap()
 var counts:[Int:Int]=[:], alphaClear=0,alphaPartial=0,alphaSolid=0
 for y in 0..<H {for x in 0..<W {
  let i=y*W*4+x*4
  var rgb=paper
  for k in 0..<4 {let b=plates[k],j=y*b.bytesPerRow+x*b.samplesPerPixel;let d=k==3 ? Double(b.bitmapData![j+1])/255 : min(255,Double(b.bitmapData![j])+Double(b.bitmapData![j+1]))/255
   for c in 0..<3 {rgb[c] *= 1-d+d*pigment[k][c]/255}
  }
  let nb=plates[3],ni=y*nb.bytesPerRow+x*nb.samplesPerPixel,a=nb.bitmapData![ni]
  let colour=rgb.map{Int($0.rounded())}
  for c in 0..<3 {flat.bitmapData![i+c]=UInt8(colour[c]);ink.bitmapData![i+c]=UInt8(inkRGB[c]);preview.bitmapData![i+c]=UInt8((rgb[c]*(1-Double(a)/255)+Double(inkRGB[c])*Double(a)/255).rounded())}
  flat.bitmapData![i+3]=255;ink.bitmapData![i+3]=a;preview.bitmapData![i+3]=255
  if a==0 {alphaClear+=1}else if a==255 {alphaSolid+=1}else {alphaPartial+=1}
 }}
 // Source colour labels underneath black strokes can still contain fragments
 // of the old sky mask. Extend adjacent pigment underneath the ink so hiding
 // the ink reveals a genuinely clean colour layer, not gold hatch-shaped holes.
 var known=[Bool](repeating:false,count:W*H),queue=[Int](repeating:0,count:W*H),head=0,tail=0
 for i in 0..<(W*H) {if ink.bitmapData![i*4+3]<=8 {known[i]=true;queue[tail]=i;tail+=1}}
 while head<tail {let i=queue[head];head+=1;let x=i%W
  for j in [x>0 ? i-1 : -1,x<W-1 ? i+1 : -1,i-W,i+W] {if j>=0 && j<W*H && !known[j] {known[j]=true;queue[tail]=j;tail+=1;for c in 0..<3 {flat.bitmapData![j*4+c]=flat.bitmapData![i*4+c]}}}
 }
 precondition(tail==W*H)
 for i in 0..<(W*H) {let j=i*4,a=Double(ink.bitmapData![j+3])/255;var rgb:[Int]=[]
  for c in 0..<3 {let v=Int(flat.bitmapData![j+c]);rgb.append(v);preview.bitmapData![j+c]=UInt8((Double(v)*(1-a)+Double(inkRGB[c])*a).rounded())}
  counts[(rgb[0]<<16)|(rgb[1]<<8)|rgb[2],default:0]+=1
 }
 let flatData=png(flat),inkData=png(ink)
 try flatData.write(to:out.appendingPathComponent(prefix+"-colour.png"))
 try inkData.write(to:out.appendingPathComponent(prefix+"-ink-transparent.png"))
 let ranked=counts.sorted{a,b in a.value==b.value ? a.key<b.key : a.value>b.value}
 var swatches=ranked.prefix(27).map{hex([($0.key>>16)&255,($0.key>>8)&255,$0.key&255])}
 if !swatches.contains(hex(inkRGB)){swatches.append(hex(inkRGB))}
 let project:[String:Any]=[
  "format":"light-paint","version":1,"width":W,"height":H,"activeId":1,"color":swatches[0],"swatches":swatches,
  "brushSettings":["preset":"hard","size":12,"opacity":100,"hardness":100,"pressureSize":false,"stabilizer":"smooth","stability":40,"autoTaper":false],
  "layers":[
   ["id":1,"name":"色版・在這層修色", "visible":true,"opacity":1,"alphaLock":false,"image":"data:image/png;base64,"+flatData.base64EncodedString()],
   ["id":2,"name":"墨線・參考用，請勿上色", "visible":true,"opacity":1,"alphaLock":true,"image":"data:image/png;base64,"+inkData.base64EncodedString()]
  ]
 ]
 let projectData=try JSONSerialization.data(withJSONObject:project,options:[.sortedKeys])
 try projectData.write(to:out.appendingPathComponent(prefix+".light-paint.json"))
 // Small gallery preview, generated from exactly the same two layers.
 let thumb=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:256,pixelsHigh:384,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:thumb);let im=NSImage(size:NSSize(width:W,height:H));im.addRepresentation(preview);im.draw(in:NSRect(x:0,y:0,width:256,height:384));NSGraphicsContext.restoreGraphicsState()
 try png(thumb).write(to:out.appendingPathComponent(prefix+"-preview.png"))
 manifest.append(["number":n,"id":id,"name":name,"project":prefix+".light-paint.json","colour":prefix+"-colour.png","ink":prefix+"-ink-transparent.png","preview":prefix+"-preview.png","sourceFilesSHA256":sourceHashes,"projectSHA256":sha(projectData),"transparentInkPixels":alphaClear,"partialInkPixels":alphaPartial,"solidInkPixels":alphaSolid,"swatches":swatches])
 tiles += "<article><img loading='lazy' src='\(prefix)-preview.png' alt='\(name)'><h2>\(n) · \(name)</h2><a download href='\(prefix).light-paint.json'>下載分層專案 JSON</a><details><summary>個別 PNG</summary><a download href='\(prefix)-colour.png'>純平塗</a> · <a download href='\(prefix)-ink-transparent.png'>透明墨線</a></details></article>"
 print("Exported \(prefix): \(projectData.count) bytes")
}
let manifestData=try JSONSerialization.data(withJSONObject:["format":"tarot-light-paint-export","version":1,"width":W,"height":H,"cards":manifest],options:[.prettyPrinted,.sortedKeys])
try manifestData.write(to:out.appendingPathComponent("manifest.json"))
let html="""
<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>塔羅平塗修色・Light Paint 專案</title><style>*{box-sizing:border-box}body{margin:0;background:#eee9de;color:#263047;font:16px system-ui}main{max-width:1200px;margin:auto;padding:24px}p,li{line-height:1.8}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}article{background:#faf6ed;border:1px solid #d4ccbc;padding:16px;border-radius:12px}img{display:block;width:100%;height:auto}h2{font-size:19px}a{color:#294866}details{margin-top:12px}summary{cursor:pointer}.intro{max-width:850px;margin-bottom:30px}</style><main><h1>塔羅平塗修色・Light Paint 專案</h1><div class="intro"><p>22 張牌，1024 × 1536；沒有網點、紙紋、套印位移、牌框或牌名文字。上層是透明墨線，下層是可修改的純平塗。</p><ol><li>下載需要的分層專案 JSON，在 Light Paint 按「載入專案」。</li><li>選擇「色版・在這層修色」，使用吸色與硬圓筆修正。顏色已附在專案色票中。</li><li>填色工具只參照目前圖層，不會參照上層墨線；兩區若同色相連，填色可能一起改色，請復原後用筆刷。</li><li>保存 JSON。輸出純色版 PNG 前，先隱藏「墨線」；輸出完成後可再顯示墨線。</li></ol><p>畫布是完整圖面母稿，網站會沿既有圖窗裁切。完成後保留 JSON 與純色版 PNG，便可交回整合、重新分色與套印。</p><a href="../../../colour-repair-review.html">修色前後對照</a> · <a href="README.md">完整使用說明</a> · <a download href="tarot-light-paint-projects.zip">下載全部 22 張專案 ZIP</a></div><div class="cards">\(tiles)</div></main></html>
"""
try html.write(to:out.appendingPathComponent("index.html"),atomically:true,encoding:.utf8)
